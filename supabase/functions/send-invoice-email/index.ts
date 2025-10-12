import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

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

    const { invoiceId, orderId } = await req.json();
    console.log('[Invoice Email] Sending for invoice:', invoiceId);

    // Fetch invoice with customer and order details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        orders(order_number, tracking_number, carrier, estimated_delivery_date)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    // Fetch customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', invoice.customer_id)
      .single();

    if (customerError || !customer) {
      throw new Error('Customer not found');
    }

    console.log('[Invoice Email] Sending to:', customer.email);

    // Fetch PDF from storage if available
    let pdfAttachment = null;
    if (invoice.file_url) {
      try {
        const pathParts = invoice.file_url.split('/invoices/');
        const filePath = pathParts[1];
        
        const { data: pdfData, error: downloadError } = await supabase.storage
          .from('invoices')
          .download(filePath);

        if (!downloadError && pdfData) {
          const arrayBuffer = await pdfData.arrayBuffer();
          pdfAttachment = {
            filename: `${invoice.invoice_number}.pdf`,
            content: Array.from(new Uint8Array(arrayBuffer)),
          };
        }
      } catch (err) {
        console.error('[Invoice Email] PDF download failed:', err);
      }
    }

    // Prepare email content
    const order = invoice.orders || {};
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #2563eb; }
            .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 4px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Order Has Shipped! 🚚</h1>
              <p>Order ${order.order_number}</p>
            </div>
            <div class="content">
              <p>Dear ${customer.contact_name || customer.company_name},</p>
              
              <p>Great news! Your order has been shipped and is on its way to you.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">Shipping Details</h3>
                <p><strong>Order Number:</strong> ${order.order_number}</p>
                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                ${order.tracking_number ? `<p><strong>Tracking Number:</strong> ${order.tracking_number}</p>` : ''}
                ${order.carrier ? `<p><strong>Carrier:</strong> ${order.carrier}</p>` : ''}
                ${order.estimated_delivery_date ? `<p><strong>Estimated Delivery:</strong> ${new Date(order.estimated_delivery_date).toLocaleDateString()}</p>` : ''}
              </div>

              <div class="info-box">
                <h3 style="margin-top: 0;">Invoice Summary</h3>
                <p><strong>Amount:</strong> ${invoice.currency} ${Number(invoice.total_amount).toLocaleString()}</p>
                <p><strong>Payment Terms:</strong> ${invoice.payment_terms || '30 days net'}</p>
                <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
              </div>

              <p style="text-align: center;">
                <a href="https://ppyfrftmexvgnsxlhdbz.supabase.co/customer/orders/${orderId}" class="button">
                  Track Your Order
                </a>
              </p>

              <p>Your commercial invoice is attached to this email. Please keep it for your records.</p>

              <p>If you have any questions, please don't hesitate to contact us.</p>
              
              <p>Thank you for your business!</p>
              
              <p><strong>Trust Link Ventures Limited</strong><br>
              Email: info@trustlinkventureslimited.com<br>
              Phone: +233 XXX XXX XXX</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Trust Link Ventures Limited. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    const emailData: any = {
      from: 'Trust Link Ventures <info@trustlinkventureslimited.com>',
      to: [customer.email],
      subject: `Your Order Has Shipped - ${order.order_number}`,
      html: emailHtml,
    };

    if (pdfAttachment) {
      emailData.attachments = [pdfAttachment];
    }

    const { data: emailResponse, error: emailError } = await resend.emails.send(emailData);

    if (emailError) {
      throw emailError;
    }

    console.log('[Invoice Email] Sent successfully:', emailResponse.id);

    // Log email
    await supabase.from('email_logs').insert({
      email_type: 'invoice_shipped',
      recipient_email: customer.email,
      subject: emailData.subject,
      status: 'sent',
      resend_id: emailResponse.id,
      order_id: orderId,
      metadata: { invoice_id: invoiceId },
    });

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Invoice Email] Error:', error);
    
    // Log failed email
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { orderId } = await req.json();
      await supabase.from('email_logs').insert({
        email_type: 'invoice_shipped',
        recipient_email: '',
        subject: 'Invoice Shipped',
        status: 'failed',
        error_message: error.message,
        order_id: orderId,
      });
    } catch {}

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
