import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { invoiceId } = await req.json();

    // Fetch invoice data
    const { data: invoice, error: invError } = await supabaseClient
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invError) throw invError;

    // Fetch invoice items
    const { data: items } = await supabaseClient
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    // Fetch customer data
    const { data: customer } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('id', invoice.customer_id)
      .single();

    // Generate HTML for PDF
    const html = generateInvoiceHTML({
      invoice,
      customer,
      items: items || [],
    });

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
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
  const { invoice, customer, items } = data;
  const invoiceTypeLabel = invoice.invoice_type === 'proforma' ? 'Proforma Invoice' : 
                          invoice.invoice_type === 'packing_list' ? 'Packing List' : 
                          'Commercial Invoice';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page { margin: 20mm; }
        body {
          font-family: 'Helvetica', 'Arial', sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #2563eb;
        }
        .company-info {
          flex: 1;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .invoice-details {
          text-align: right;
        }
        .invoice-title {
          font-size: 28px;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 10px;
        }
        .invoice-meta {
          font-size: 14px;
          color: #666;
        }
        .parties {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .party {
          flex: 1;
        }
        .party-title {
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
          font-size: 16px;
        }
        .party-details {
          font-size: 14px;
          line-height: 1.6;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background-color: #2563eb;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .text-right {
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
          border-top: 2px solid #2563eb;
          padding-top: 12px;
          margin-top: 8px;
          font-weight: bold;
          font-size: 18px;
          color: #2563eb;
        }
        .footer {
          margin-top: 60px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #666;
        }
        .payment-terms {
          background-color: #f0f9ff;
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
          border-left: 4px solid #2563eb;
        }
        .payment-terms-title {
          font-weight: bold;
          margin-bottom: 8px;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="company-info">
            <div class="company-name">Trust Link Ventures Limited</div>
            <div>P.O. Box 123</div>
            <div>Accra, Ghana</div>
            <div>Email: info@trustlinkventureslimited.com</div>
            <div>Phone: +233 XXX XXX XXX</div>
          </div>
          <div class="invoice-details">
            <div class="invoice-title">${invoiceTypeLabel}</div>
            <div class="invoice-meta">
              <div><strong>Invoice #:</strong> ${invoice.invoice_number}</div>
              <div><strong>Date:</strong> ${new Date(invoice.issue_date).toLocaleDateString()}</div>
              ${invoice.due_date ? `<div><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</div>` : ''}
            </div>
          </div>
        </div>

        <div class="parties">
          <div class="party">
            <div class="party-title">Bill To:</div>
            <div class="party-details">
              <div><strong>${customer?.company_name || customer?.contact_name || 'Customer'}</strong></div>
              ${customer?.contact_name ? `<div>${customer.contact_name}</div>` : ''}
              ${customer?.email ? `<div>${customer.email}</div>` : ''}
              ${customer?.phone ? `<div>${customer.phone}</div>` : ''}
              ${customer?.country ? `<div>${customer.country}</div>` : ''}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any) => `
              <tr>
                <td>
                  <strong>${item.product_name}</strong>
                  ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ''}
                </td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${invoice.currency} ${Number(item.unit_price).toFixed(2)}</td>
                <td class="text-right">${invoice.currency} ${Number(item.total_price).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>${invoice.currency} ${Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          ${invoice.tax_amount > 0 ? `
            <div class="totals-row">
              <span>Tax:</span>
              <span>${invoice.currency} ${Number(invoice.tax_amount).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="totals-row total">
            <span>Total:</span>
            <span>${invoice.currency} ${Number(invoice.total_amount).toFixed(2)}</span>
          </div>
        </div>

        ${invoice.invoice_type === 'proforma' || invoice.invoice_type === 'commercial' ? `
          <div class="payment-terms">
            <div class="payment-terms-title">Payment Terms</div>
            <div>${invoice.payment_terms || 'Payment due within 30 days'}</div>
            ${invoice.notes ? `<div style="margin-top: 10px;"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
          </div>
        ` : ''}

        <div class="footer">
          <p><strong>Thank you for your business!</strong></p>
          <p>This is a system-generated document.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
