import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orderId, type } = await req.json();

    console.log('Generating invoice for order:', orderId, 'type:', type);

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*),
        quotes(
          quote_number,
          customers(
            company_name,
            contact_name,
            email,
            phone,
            address
          )
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;
    if (!order) throw new Error('Order not found');

    console.log('Order fetched:', order.order_number);

    // Generate HTML invoice
    const invoiceHtml = generateInvoiceHTML(order, type);

    // Convert HTML to PDF using jsPDF or similar
    // For now, we'll return the HTML as a base64 encoded PDF placeholder
    // In production, you'd use a proper PDF generation library
    const pdfData = btoa(invoiceHtml);

    return new Response(
      JSON.stringify({ pdf: pdfData, orderNumber: order.order_number }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating invoice:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function generateInvoiceHTML(order: any, type: string): string {
  const customer = order.quotes?.customers || {};
  const items = order.order_items || [];
  
  const isProforma = type === 'proforma';
  const title = isProforma ? 'PROFORMA INVOICE' : 'COMMERCIAL INVOICE';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title} - ${order.order_number}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 20px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #0066cc;
      margin-bottom: 5px;
    }
    .invoice-type {
      font-size: 20px;
      font-weight: bold;
      margin: 20px 0;
    }
    .details-section {
      display: flex;
      justify-content: space-between;
      margin: 30px 0;
    }
    .details-box {
      width: 48%;
    }
    .details-box h3 {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #0066cc;
    }
    .details-box p {
      margin: 5px 0;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background-color: #0066cc;
      color: white;
      padding: 12px;
      text-align: left;
      font-size: 12px;
    }
    td {
      border-bottom: 1px solid #ddd;
      padding: 10px;
      font-size: 12px;
    }
    .totals {
      text-align: right;
      margin-top: 20px;
    }
    .totals table {
      margin-left: auto;
      width: 300px;
    }
    .totals td {
      border: none;
      padding: 5px 10px;
    }
    .totals .total-row {
      font-weight: bold;
      font-size: 14px;
      background-color: #f5f5f5;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #ddd;
      font-size: 10px;
      color: #666;
      text-align: center;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
    }
    .status-delivered {
      background-color: #d4edda;
      color: #155724;
    }
    .status-shipped {
      background-color: #fff3cd;
      color: #856404;
    }
    .status-processing {
      background-color: #cce5ff;
      color: #004085;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">TRUST LINK VENTURES</div>
    <p style="margin: 5px 0; font-size: 12px;">Premium Seafood & Meat Products</p>
    <p style="margin: 5px 0; font-size: 11px;">Tema, Ghana | Email: info@trustlinkventures.com</p>
  </div>

  <div class="invoice-type">${title}</div>

  <div class="details-section">
    <div class="details-box">
      <h3>BILL TO:</h3>
      <p><strong>${customer.company_name || 'N/A'}</strong></p>
      <p>${customer.contact_name || ''}</p>
      <p>${customer.email || ''}</p>
      <p>${customer.phone || ''}</p>
      <p>${customer.address || ''}</p>
    </div>
    <div class="details-box">
      <h3>INVOICE DETAILS:</h3>
      <p><strong>Invoice #:</strong> ${order.order_number}</p>
      <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
      <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${order.status.replace(/_/g, ' ').toUpperCase()}</span></p>
      ${order.estimated_delivery_date ? `<p><strong>Delivery Date:</strong> ${new Date(order.estimated_delivery_date).toLocaleDateString()}</p>` : ''}
      ${order.tracking_number ? `<p><strong>Tracking:</strong> ${order.tracking_number}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50%">Product</th>
        <th style="width: 15%; text-align: right">Quantity</th>
        <th style="width: 15%; text-align: right">Unit Price</th>
        <th style="width: 20%; text-align: right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item: any) => `
        <tr>
          <td>
            <strong>${item.product_name}</strong>
            ${item.product_description ? `<br><span style="color: #666; font-size: 11px;">${item.product_description}</span>` : ''}
            ${item.specifications ? `<br><span style="color: #666; font-size: 11px;">Specs: ${item.specifications}</span>` : ''}
          </td>
          <td style="text-align: right">${item.quantity} ${item.unit}</td>
          <td style="text-align: right">${order.currency} ${(item.unit_price || 0).toLocaleString()}</td>
          <td style="text-align: right">${order.currency} ${(item.total_price || 0).toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr class="total-row">
        <td>TOTAL AMOUNT:</td>
        <td style="text-align: right">${order.currency} ${(order.total_amount || 0).toLocaleString()}</td>
      </tr>
    </table>
  </div>

  ${order.notes ? `
  <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #0066cc;">
    <h3 style="margin: 0 0 10px 0; font-size: 13px; color: #0066cc;">Notes:</h3>
    <p style="margin: 0; font-size: 12px;">${order.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Thank you for your business!</p>
    <p>This is an ${isProforma ? 'unofficial proforma invoice for quotation purposes' : 'official commercial invoice'}.</p>
    <p>For questions, please contact us at info@trustlinkventures.com</p>
  </div>
</body>
</html>
  `.trim();
}
