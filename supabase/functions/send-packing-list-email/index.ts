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
    console.log('[Packing List Email] Sending for invoice:', invoiceId);

    // Fetch invoice with order details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        orders(order_number, estimated_delivery_date)
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

    console.log('[Packing List Email] Sending to:', customer.email);

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
        console.error('[Packing List Email] PDF download failed:', err);
      }
    }

    // Prepare email content
    const order = invoice.orders || {};
    const portalBaseUrl = 'https://trustlinkcompany.com';
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #10b981; }
            .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 4px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Order is Ready to Ship! 📦</h1>
              <p>Order ${order.order_number}</p>
            </div>
            <div class="content">
              <p>Dear ${customer.contact_name || customer.company_name},</p>
              
              <p>Good news! Your order is packed and ready for shipment.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">Order Details</h3>
                <p><strong>Order Number:</strong> ${order.order_number}</p>
                <p><strong>Packing List Number:</strong> ${invoice.invoice_number}</p>
                ${order.estimated_delivery_date ? `<p><strong>Estimated Ship Date:</strong> ${new Date(order.estimated_delivery_date).toLocaleDateString()}</p>` : ''}
              </div>

              <p style="text-align: center;">
                <a href="${portalBaseUrl}/portal/orders/${orderId}" class="button">
                  View Order Details
                </a>
              </p>

              <p>Your packing list and other order documents are available in your customer portal. You will receive tracking information once the shipment is picked up by the carrier.</p>

              <p>If you have any questions, please don't hesitate to contact us.</p>
              
              <p>Thank you for your business!</p>
              
              <p><strong>Trust Link Ventures Limited</strong><br>
              Email: info@trustlinkcompany.com<br>
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
      from: 'Trust Link Ventures <info@trustlinkcompany.com>',
      to: [customer.email],
      subject: `Your Order is Ready to Ship - ${order.order_number}`,
      html: emailHtml,
    };

    if (pdfAttachment) {
      emailData.attachments = [pdfAttachment];
    }

    const { data: emailResponse, error: emailError } = await resend.emails.send(emailData);

    if (emailError) {
      throw emailError;
    }

    console.log('[Packing List Email] Sent successfully:', emailResponse.id);

    // Log email
    await supabase.from('email_logs').insert({
      email_type: 'packing_list_ready',
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
    console.error('[Packing List Email] Error:', error);
    
    // Log failed email
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { orderId } = await req.json();
      await supabase.from('email_logs').insert({
        email_type: 'packing_list_ready',
        recipient_email: '',
        subject: 'Packing List Ready',
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
