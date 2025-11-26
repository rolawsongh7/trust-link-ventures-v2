import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentConfirmationRequest {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  paymentReference: string;
  paymentProofUrl?: string;
  hasDeliveryAddress: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      orderId,
      orderNumber,
      customerEmail,
      paymentReference,
      paymentProofUrl,
      hasDeliveryAddress,
    }: PaymentConfirmationRequest = await req.json();

    console.log("Processing payment confirmation for order:", orderNumber);

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        customers(company_name, contact_name, email)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    const customerName = order.customers?.company_name || order.customers?.contact_name || "Customer";
    const contactName = order.customers?.contact_name || "there";

    // Admin email
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #047857; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .label { font-weight: 600; color: #6b7280; }
          .value { color: #111827; }
          .button { display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          .next-steps { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">✓ Payment Confirmed</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Order #${orderNumber}</p>
          </div>
          
          <div class="content">
            <h3 style="color: #047857; margin-top: 0;">Payment Details</h3>
            
            <div class="detail-row">
              <span class="label">Order Number:</span>
              <span class="value">${orderNumber}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Customer:</span>
              <span class="value">${customerName} (${contactName})</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Email:</span>
              <span class="value">${customerEmail}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Payment Reference:</span>
              <span class="value"><strong>${paymentReference}</strong></span>
            </div>
            
            <div class="detail-row">
              <span class="label">Amount:</span>
              <span class="value">${order.currency} ${parseFloat(order.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            ${paymentProofUrl ? `
            <div style="margin: 20px 0;">
              <a href="${paymentProofUrl}" class="button" target="_blank">View Payment Receipt</a>
            </div>
            ` : ''}

            <div style="margin: 20px 0;">
              <a href="https://${supabaseUrl.replace('https://', '').split('.')[0]}.lovableproject.com/admin/orders" class="button">View Order Dashboard</a>
            </div>

            <div class="next-steps">
              <h4 style="margin: 0 0 10px 0; color: #92400e;">Next Steps:</h4>
              <ul style="margin: 0; padding-left: 20px;">
                ${!hasDeliveryAddress ? '<li>Customer has been notified to provide delivery address</li>' : ''}
                ${hasDeliveryAddress ? '<li>Invoice has been generated and sent to customer</li>' : ''}
                <li>Update order status to "processing" when ready</li>
                <li>Begin procurement and fulfillment</li>
              </ul>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from Trust Link Ventures Limited</p>
            <p>info@trustlinkcompany.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Customer email
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #047857; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
          .highlight-box { background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #047857; }
          .info-box { background: #f0f9ff; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✓ Payment Confirmed</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Order #${orderNumber}</p>
          </div>
          
          <div class="content">
            <p>Dear ${contactName},</p>
            
            <p>Thank you! We have successfully confirmed your payment for <strong>Order #${orderNumber}</strong>.</p>
            
            <div class="highlight-box">
              <p style="margin: 0;"><strong>Payment Reference:</strong> ${paymentReference}</p>
              <p style="margin: 10px 0 0 0;"><strong>Amount:</strong> ${order.currency} ${parseFloat(order.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>

            ${!hasDeliveryAddress ? `
            <div class="info-box">
              <h3 style="margin: 0 0 10px 0; color: #0369a1;">📍 Next Step: Delivery Address</h3>
              <p style="margin: 0;">We have sent you a separate email requesting your delivery address. Once we receive it, we will begin processing your order immediately.</p>
            </div>
            ` : `
            <div class="info-box">
              <h3 style="margin: 0 0 10px 0; color: #0369a1;">📦 What's Next?</h3>
              <p style="margin: 0;">Your invoice has been generated and sent to you. Our team will begin processing your order and keep you updated on the progress.</p>
            </div>
            `}

            <p style="margin-top: 30px;">If you have any questions or concerns, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br><strong>Trust Link Ventures Limited</strong></p>
          </div>
          
          <div class="footer">
            <p><strong>Contact Us:</strong></p>
            <p>Email: info@trustlinkcompany.com</p>
            <p>© ${new Date().getFullYear()} Trust Link Ventures Limited. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send admin email
    const adminEmail = await resend.emails.send({
      from: "Trust Link Ventures <info@trustlinkcompany.com>",
      to: ["info@trustlinkcompany.com"],
      subject: `[PAYMENT CONFIRMED] Order #${orderNumber} - ${customerName}`,
      html: adminEmailHtml,
    });

    console.log("Admin email sent:", adminEmail);

    // Send customer email
    const customerEmailResponse = await resend.emails.send({
      from: "Trust Link Ventures <info@trustlinkcompany.com>",
      to: [customerEmail],
      subject: `Payment Confirmed - Order #${orderNumber}`,
      html: customerEmailHtml,
    });

    console.log("Customer email sent:", customerEmailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        adminEmailId: adminEmail.data?.id,
        customerEmailId: customerEmailResponse.data?.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-payment-confirmation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
