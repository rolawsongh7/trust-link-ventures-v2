import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { invoiceId } = await req.json();
    console.log('Generating PDF for invoice:', invoiceId);

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
        .select('order_number, delivery_address_id')
        .eq('id', invoice.order_id)
        .single();
      order = orderData;
    }

    // Generate HTML
    const html = generateInvoiceHTML({
      invoice,
      items: items || [],
      customer: customer || {},
      order
    });

    console.log('HTML generated, converting to PDF...');

    // Convert HTML to PDF using Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    await browser.close();

    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateInvoiceHTML(data: any): string {
  const { invoice, items, customer, order } = data;
  
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
          <h1>Trust Link Ventures Limited</h1>
          <p>P.O. Box KA 16498, Airport Residential Area</p>
          <p>Accra, Ghana</p>
          <p>Phone: +233 XXX XXX XXX</p>
          <p>Email: info@trustlinkventureslimited.com</p>
        </div>
        <div class="invoice-details">
          <h2>${invoiceTypeTitle}</h2>
          <p><strong>${invoice.invoice_number}</strong></p>
          <p>Date: ${new Date(invoice.issue_date).toLocaleDateString()}</p>
          ${invoice.due_date && invoice.invoice_type !== 'packing_list' ? `<p>Due Date: ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ''}
          ${order ? `<p>Order: ${order.order_number}</p>` : ''}
        </div>
      </div>

      <div class="billing-info">
        <div class="billing-section">
          <h3>Bill To:</h3>
          <p><strong>${customer.company_name || 'N/A'}</strong></p>
          <p>${customer.contact_name || ''}</p>
          <p>${customer.email || ''}</p>
          <p>${customer.phone || ''}</p>
          ${customer.address ? `<p>${customer.address}</p>` : ''}
          ${customer.country ? `<p>${customer.country}</p>` : ''}
        </div>
        <div class="billing-section">
          <h3>Invoice Details:</h3>
          <p><strong>Type:</strong> ${invoiceTypeTitle}</p>
          <p><strong>Status:</strong> ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</p>
          <p><strong>Currency:</strong> ${invoice.currency}</p>
          ${invoice.payment_terms ? `<p><strong>Payment Terms:</strong> ${invoice.payment_terms}</p>` : ''}
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

      ${invoice.invoice_type === 'commercial' ? `
        <div class="notes">
          <h4>Payment Instructions:</h4>
          <p>Please make payment within ${invoice.payment_terms || '30 days'} to:</p>
          <p><strong>Bank:</strong> [Bank Name]</p>
          <p><strong>Account Number:</strong> [Account Number]</p>
          <p><strong>Swift Code:</strong> [Swift Code]</p>
        </div>
      ` : ''}

      <div class="footer">
        <p>This ${invoiceTypeTitle.toLowerCase()} is computer generated and valid without signature.</p>
        <p>For questions about this invoice, please contact us at info@trustlinkventureslimited.com</p>
        <p style="margin-top: 15px; text-align: center;">&copy; ${new Date().getFullYear()} Trust Link Ventures Limited. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}
