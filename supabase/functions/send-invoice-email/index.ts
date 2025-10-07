import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = 'Trust Link Ventures <noreply@trustlinkventureslimited.com>';

interface SendInvoiceEmailRequest {
  orderId: string;
  customerEmail: string;
  invoiceData?: any;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function logEmailAttempt(data: {
  email_type: string;
  recipient_email: string;
  subject: string;
  status: string;
  error_message?: string;
  resend_id?: string;
  order_id?: string;
  metadata?: any;
}) {
  try {
    await supabase.from('email_logs').insert({
      email_type: data.email_type,
      recipient_email: data.recipient_email,
      subject: data.subject,
      status: data.status,
      error_message: data.error_message,
      resend_id: data.resend_id,
      order_id: data.order_id,
      metadata: data.metadata || {},
    });
  } catch (err) {
    console.error('[Email Logging] Exception:', err);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, customerEmail, invoiceData }: SendInvoiceEmailRequest = await req.json();

    console.log(`[Invoice Email] Sending invoice for order ${orderId} to ${customerEmail}`);
    
    if (!orderId || !customerEmail) {
      throw new Error('Missing required fields: orderId and customerEmail are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      throw new Error(`Invalid email format: ${customerEmail}`);
    }

    // Get order and invoice details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customers(company_name, contact_name, email),
        quotes(quote_number, title),
        order_items(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[Invoice Email] Order fetch error:', orderError);
      await logEmailAttempt({
        email_type: 'invoice',
        recipient_email: customerEmail,
        subject: `Invoice for Order ${orderId}`,
        status: 'failed',
        error_message: `Order not found: ${orderError?.message}`,
        order_id: orderId,
      });
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    // Get the latest invoice for this order
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (invoiceError && invoiceError.code !== 'PGRST116') {
      console.error('[Invoice Email] Invoice fetch error:', invoiceError);
    }

    console.log(`[Invoice Email] Order found: ${order.order_number}`);

    const itemsHtml = order.order_items.map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.product_name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity} ${item.unit}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${order.currency} ${item.unit_price.toLocaleString()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${order.currency} ${item.total_price.toLocaleString()}</td>
      </tr>
    `).join('');

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px;">Invoice Generated</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Payment Confirmed</p>
        </div>
        
        <div style="padding: 40px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${order.customers?.contact_name || 'Valued Customer'},</p>
          
          <p style="margin-bottom: 20px;">Thank you for your payment! Your invoice has been generated and is available for download.</p>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h3 style="margin-top: 0; color: #059669;">Order & Invoice Information</h3>
            <p><strong>Order Number:</strong> ${order.order_number}</p>
            ${invoice ? `<p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>` : ''}
            <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
            ${order.payment_reference ? `<p><strong>Payment Reference:</strong> ${order.payment_reference}</p>` : ''}
            <p><strong>Total Amount:</strong> ${order.currency} ${order.total_amount.toLocaleString()}</p>
          </div>

          <div style="margin: 30px 0;">
            <h4 style="color: #059669; margin-bottom: 15px;">Order Items</h4>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Quantity</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr style="background-color: #f0fdf4; font-weight: bold;">
                  <td colspan="3" style="padding: 15px; text-align: right; border-top: 2px solid #10b981;">Total Amount:</td>
                  <td style="padding: 15px; text-align: right; border-top: 2px solid #10b981; font-size: 18px; color: #059669;">
                    ${order.currency} ${order.total_amount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          ${order.delivery_notes ? `
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af;"><strong>Delivery Instructions:</strong></p>
            <p style="margin: 5px 0 0 0; color: #1e40af;">${order.delivery_notes}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${Deno.env.get('SUPABASE_URL')}/functions/v1/order-tracking?orderId=${orderId}" 
               style="display: inline-block; background-color: #059669; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              📦 View Invoice in Customer Portal
            </a>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 30px 0;">
            <p style="margin: 0; color: #92400e;"><strong>Next Steps:</strong></p>
            <p style="margin: 5px 0 0 0; color: #92400e;">Your order is now being processed. You will receive tracking information once your order has been shipped.</p>
          </div>
          
          <p style="margin-top: 30px;">If you have any questions about your invoice or order, please don't hesitate to contact us.</p>
          
          <p style="margin-bottom: 0;">Best regards,<br>
          <strong>Trust Link Ventures Team</strong><br>
          Email: info@trustlinkventures.com<br>
          Phone: +233 123 456 789</p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    console.log(`[Invoice Email] Sending email via Resend to ${customerEmail}`);
    
    const emailResponse = await resend.emails.send({
      from: FROM_EMAIL,
      to: [customerEmail],
      subject: `Invoice ${invoice?.invoice_number || 'Generated'} - Order ${order.order_number}`,
      html: emailHtml,
    });

    if (emailResponse.error) {
      console.error('[Invoice Email] Resend API error:', emailResponse.error);
      await logEmailAttempt({
        email_type: 'invoice',
        recipient_email: customerEmail,
        subject: `Invoice for Order ${order.order_number}`,
        status: 'failed',
        error_message: emailResponse.error.message || JSON.stringify(emailResponse.error),
        order_id: orderId,
        metadata: { order_number: order.order_number },
      });
      throw new Error(`Resend API error: ${emailResponse.error.message}`);
    }

    console.log('[Invoice Email] Email sent successfully:', emailResponse.data);
    
    await logEmailAttempt({
      email_type: 'invoice',
      recipient_email: customerEmail,
      subject: `Invoice for Order ${order.order_number}`,
      status: 'sent',
      resend_id: emailResponse.data?.id,
      order_id: orderId,
      metadata: { 
        order_number: order.order_number,
        invoice_number: invoice?.invoice_number,
        resend_response: emailResponse.data
      },
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Invoice email sent successfully",
      emailId: emailResponse.data?.id,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('[Invoice Email] Critical error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send invoice email'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
