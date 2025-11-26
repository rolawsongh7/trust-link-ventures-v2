import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const FUNCTION_VERSION = '4.2.0'; // Logo repositioned to right of company name

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[PDF Generation] Function Version: ${FUNCTION_VERSION}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const pdfshiftApiKey = Deno.env.get('PDFSHIFT_API_KEY');
    
    // Critical validation: API key must be present
    if (!pdfshiftApiKey || pdfshiftApiKey.trim() === '') {
      const errorMsg = 'PDFSHIFT_API_KEY not configured or empty. Please add the secret in Supabase dashboard.';
      console.error('[PDF Generation] CRITICAL:', errorMsg);
      return new Response(
        JSON.stringify({ 
          error: errorMsg,
          code: 'MISSING_API_KEY',
          version: FUNCTION_VERSION
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Log key details for debugging (safe to log prefix)
    const keyPrefix = pdfshiftApiKey.substring(0, 7);
    console.log('[PDF Generation] API key validated, length:', pdfshiftApiKey.length, 'prefix:', keyPrefix);
    
    // Additional validation - correct key should be 48 chars starting with sk_aaa8
    if (pdfshiftApiKey.length !== 48) {
      console.warn('[PDF Generation] WARNING: API key length is', pdfshiftApiKey.length, 'but expected 48 characters');
    }
    if (!keyPrefix.startsWith('sk_aaa8')) {
      console.warn('[PDF Generation] WARNING: API key prefix is', keyPrefix, 'but expected to start with sk_aaa8');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch Trust Link Ventures logo from storage
    let logoDataUrl = null;
    try {
      const { data: logoData, error: logoError } = await supabase.storage
        .from('logos')
        .download('trust_link_ventures.png');
      
      if (logoData && !logoError) {
        const arrayBuffer = await logoData.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        logoDataUrl = `data:image/png;base64,${base64}`;
        console.log('[PDF Generation] Trust Link logo loaded successfully');
      }
    } catch (error) {
      console.log('[PDF Generation] Failed to load Trust Link logo:', error);
    }

    const { invoiceId, invoiceType, quoteNumber, deliveryAddress } = await req.json();
    console.log('[PDF Generation] Processing invoice:', { invoiceId, invoiceType, timestamp: new Date().toISOString() });

    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    // Fetch invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice fetch error:', invoiceError);
      throw new Error('Invoice not found');
    }

    // Fetch invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (itemsError) {
      console.error('Invoice items fetch error:', itemsError);
      throw new Error('Failed to fetch invoice items');
    }

    // Fetch customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', invoice.customer_id)
      .single();

    if (customerError) {
      console.error('Customer fetch error:', customerError);
    }

    // Fetch order data if available
    let order = null;
    if (invoice.order_id) {
      const { data: orderData } = await supabase
        .from('orders')
        .select('order_number, delivery_address_id, carrier, tracking_number, payment_method, payment_reference')
        .eq('id', invoice.order_id)
        .single();
      order = orderData;
      console.log('[PDF Generation] Order data:', { 
        order_number: order?.order_number,
        payment_method: order?.payment_method,
        payment_reference: order?.payment_reference
      });
    }

    // Generate HTML
    const html = generateInvoiceHTML({
      invoice,
      items: items || [],
      customer: customer || {},
      order,
      quoteNumber: quoteNumber,
      deliveryAddress: deliveryAddress,
      logoDataUrl: logoDataUrl
    });

    console.log('[PDF Generation] Step: HTML generated, length:', html.length);

    // Convert HTML to PDF using PDFShift API with retry logic
    let pdfBuffer: ArrayBuffer | null = null;
    let lastError: Error | null = null;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[PDF Generation] Retry attempt ${attempt} of ${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        }

        console.log(`[PDF Generation] Step: PDFShift attempt ${attempt + 1}/${maxRetries + 1}`);
        const pdfshiftResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
          method: 'POST',
          headers: {
            'X-API-Key': pdfshiftApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source: html,
            landscape: false,
            use_print: true,
            format: 'A4',
            margin: {
              top: '20px',
              right: '20px',
              bottom: '20px',
              left: '20px'
            }
          }),
        });

        if (!pdfshiftResponse.ok) {
          const errorText = await pdfshiftResponse.text();
          console.error(`[PDF Generation] PDFShift error (attempt ${attempt + 1}):`, pdfshiftResponse.status, errorText);
          throw new Error(`PDFShift API error (${pdfshiftResponse.status}): ${errorText}`);
        }

        pdfBuffer = await pdfshiftResponse.arrayBuffer();
        console.log('[PDF Generation] Step: PDF generated successfully, size:', pdfBuffer.byteLength, 'bytes');
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        console.error(`[PDF Generation] Attempt ${attempt + 1} failed:`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`PDF generation failed after ${maxRetries + 1} attempts: ${lastError.message}`);
        }
      }
    }

    if (!pdfBuffer) {
      throw new Error('PDF generation failed: No buffer returned');
    }

    // Upload to storage
    const folderName = invoiceType === 'packing_list' ? 'packing_list' : 'commercial_invoice';
    const filePath = `${folderName}/${invoice.invoice_number}.pdf`;
    
    console.log('[PDF Generation] Step: Uploading to storage:', filePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[PDF Generation] Storage upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log('[PDF Generation] Step: Upload successful');
    
    // Store only the file path - signed URLs will be generated on-demand
    console.log('[PDF Generation] PDF uploaded successfully to:', filePath);

    // Update the invoice record with the file path (not signed URL)
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ file_url: filePath })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('[PDF Generation] Failed to update invoice:', updateError);
      throw new Error(`Failed to update invoice: ${updateError.message}`);
    }

    console.log('[PDF Generation] Invoice updated with file path');

    return new Response(
      JSON.stringify({ 
        success: true,
        fileUrl: filePath,
        invoiceNumber: invoice.invoice_number,
        message: 'PDF generated and stored successfully'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('[PDF Generation] Fatal Error:', {
      error: error.message,
      stack: error.stack,
      version: FUNCTION_VERSION,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: import.meta.env?.DEV ? error.stack : undefined,
        version: FUNCTION_VERSION,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateInvoiceHTML(data: any): string {
  const { invoice, items, customer, order, quoteNumber, deliveryAddress, logoDataUrl } = data;
  
  const invoiceTypeTitle = invoice.invoice_type === 'proforma' 
    ? 'PROFORMA INVOICE' 
    : invoice.invoice_type === 'packing_list'
    ? 'PACKING LIST'
    : 'COMMERCIAL INVOICE';

  const itemsHtml = items.map((item: any, index: number) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${index + 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong>${item.product_name}</strong>
        ${item.description ? `<br><small style="color: #6b7280;">${item.description}</small>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${Number(item.quantity).toLocaleString()}</td>
      ${invoice.invoice_type !== 'packing_list' ? `
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${invoice.currency} ${Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;"><strong>${invoice.currency} ${Number(item.total_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
      ` : ''}
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${invoiceTypeTitle} - ${invoice.invoice_number}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #2563eb;
        }
        .company-info h1 {
          margin: 0;
          color: #1e40af;
          font-size: 24px;
        }
        .company-info p {
          margin: 5px 0;
          color: #6b7280;
          font-size: 14px;
        }
        .invoice-details {
          text-align: right;
        }
        .invoice-details h2 {
          margin: 0;
          color: #1e40af;
          font-size: 28px;
        }
        .invoice-details p {
          margin: 5px 0;
          font-size: 14px;
        }
        .billing-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        .billing-section h3 {
          margin-top: 0;
          color: #1e40af;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .billing-section p {
          margin: 5px 0;
          font-size: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background-color: #f3f4f6;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }
        th:nth-child(3), th:nth-child(4), th:nth-child(5) {
          text-align: right;
        }
        .totals {
          margin-left: auto;
          width: 300px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }
        .totals-row.total {
          border-top: 2px solid #1e40af;
          font-weight: bold;
          font-size: 18px;
          color: #1e40af;
          margin-top: 10px;
          padding-top: 15px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
        }
        .notes {
          background-color: #f9fafb;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        .notes h4 {
          margin-top: 0;
          color: #374151;
          font-size: 14px;
        }
        .notes p {
          margin: 5px 0;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
            <div>
              <h1 style="margin: 0;">Trust Link Ventures Limited</h1>
            </div>
            ${logoDataUrl ? `
              <img src="${logoDataUrl}" alt="Trust Link Ventures Logo" style="width: 80px; height: 80px; object-fit: contain;" />
            ` : ''}
          </div>
          <p>Enyedado Coldstore Premises</p>
          <p>Afko Junction Box 709, Adabraka</p>
          <p>Accra, Ghana</p>
          <p>Phone: +233 246 619 489</p>
          <p>Email: info@trustlinkcompany.com</p>
        </div>
        <div class="invoice-details">
          <h2>${invoiceTypeTitle}</h2>
          <p><strong>${invoice.invoice_number}</strong></p>
          <p>Date: ${new Date(invoice.issue_date).toLocaleDateString()}</p>
          ${invoice.due_date && invoice.invoice_type !== 'packing_list' && invoice.invoice_type !== 'commercial' ? `<p>Due Date: ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ''}
          ${order ? `<p>Order: ${order.order_number}</p>` : ''}
          ${quoteNumber ? `<p>Quote: ${quoteNumber}</p>` : ''}
        </div>
      </div>

      <div class="billing-info" style="${invoice.invoice_type === 'commercial' ? 'grid-template-columns: 1fr 1fr 1fr; gap: 15px;' : ''}">
        <!-- Column 1: Bill To -->
        <div class="billing-section">
          <h3>Bill To:</h3>
          <p><strong>${customer.company_name || 'N/A'}</strong></p>
          <p>${customer.contact_name || ''}</p>
          <p>${customer.email || ''}</p>
          <p>${customer.phone || ''}</p>
          ${customer.address ? `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 11px; color: #6b7280; margin-bottom: 3px;"><strong>Registered Address:</strong></p>
              <p style="font-size: 11px; color: #374151;">${customer.address}</p>
            </div>
          ` : ''}
          ${customer.country ? `<p style="margin-top: 5px;">${customer.country}</p>` : ''}
        </div>

        <!-- Column 2: Delivery/Shipping (Commercial Invoice Only) -->
        ${invoice.invoice_type === 'commercial' ? `
          <div class="billing-section">
            <h3>Delivery/Shipping:</h3>
            ${deliveryAddress && deliveryAddress.receiver_name ? `
              <p><strong>${deliveryAddress.receiver_name}</strong></p>
              <p>${deliveryAddress.phone_number || ''}</p>
              <p style="margin-top: 8px; font-size: 12px; line-height: 1.4;">${deliveryAddress.full_address || ''}</p>
            ` : '<p style="color: #6b7280; font-style: italic;">Delivery address pending</p>'}
            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
              <p><strong>Carrier:</strong> ${order?.carrier || '<em style="color: #6b7280;">To be determined</em>'}</p>
              <p><strong>Tracking:</strong> ${order?.tracking_number || '<em style="color: #6b7280;">Pending shipment</em>'}</p>
            </div>
          </div>
        ` : ''}

        <!-- Column 3: Invoice Details -->
        <div class="billing-section">
          <h3>Invoice Details:</h3>
          <p><strong>Type:</strong> ${invoiceTypeTitle}</p>
          <p><strong>Status:</strong> <span style="color: ${
            invoice.status === 'paid' ? '#059669' : 
            invoice.status === 'sent' ? '#f59e0b' : 
            '#6b7280'
          }; font-weight: 600;">${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span></p>
          <p><strong>Currency:</strong> ${invoice.currency}</p>
          
          ${invoice.invoice_type === 'commercial' && order ? `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
              <p><strong>Payment Method:</strong></p>
              <p style="margin-left: 10px; font-size: 12px;">
                ${order.payment_method === 'mobile_money' ? '📱 Mobile Money' : order.payment_method === 'bank_transfer' ? '🏦 Bank Transfer' : 'Not specified'}
              </p>
              <p style="margin-top: 8px;"><strong>Payment Reference:</strong></p>
              <p style="margin-left: 10px; font-family: monospace; font-size: 11px; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; display: inline-block;">
                ${order.payment_reference || 'Not provided'}
              </p>
            </div>
          ` : ''}
          
          ${invoice.payment_terms && invoice.invoice_type !== 'commercial' ? `<p><strong>Payment Terms:</strong> ${invoice.payment_terms}</p>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th>Description</th>
            <th style="width: 100px; text-align: center;">Quantity</th>
            ${invoice.invoice_type !== 'packing_list' ? `
              <th style="width: 120px; text-align: right;">Unit Price</th>
              <th style="width: 120px; text-align: right;">Total</th>
            ` : ''}
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      ${invoice.invoice_type !== 'packing_list' ? `
        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>${invoice.currency} ${Number(invoice.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          ${invoice.tax_amount > 0 ? `
            <div class="totals-row">
              <span>Tax:</span>
              <span>${invoice.currency} ${Number(invoice.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ` : ''}
          <div class="totals-row total">
            <span>Total:</span>
            <span>${invoice.currency} ${Number(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      ` : ''}

      ${invoice.notes ? `
        <div class="notes">
          <h4>Notes:</h4>
          <p>${invoice.notes}</p>
        </div>
      ` : ''}

      <div class="footer">
        <p style="text-align: center; color: #374151; font-size: 11px; line-height: 1.6;">
          ${invoice.invoice_type === 'commercial' 
            ? '<strong>This is an official commercial invoice issued by Trust Link Ventures Limited.</strong><br/>This document certifies the transaction details and serves as proof of purchase for customs and regulatory purposes.' 
            : 'This is an official invoice document.'}
        </p>
        <p style="text-align: center; margin-top: 10px;">For questions about this invoice, please contact us at info@trustlinkcompany.com</p>
        <p style="margin-top: 15px; text-align: center;">&copy; ${new Date().getFullYear()} Trust Link Ventures Limited. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}
