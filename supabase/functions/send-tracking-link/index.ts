import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackingEmailRequest {
  orderId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId }: TrackingEmailRequest = await req.json();
    console.log("Sending tracking link for order:", orderId);

    if (!orderId) {
      throw new Error("Order ID is required");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        tracking_number,
        carrier,
        estimated_delivery_date,
        customers (
          company_name,
          email,
          contact_name
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Get or create tracking token
    const { data: tokenData, error: tokenError } = await supabase
      .from('delivery_tracking_tokens')
      .select('token')
      .eq('order_id', orderId)
      .maybeSingle();

    let trackingToken: string;

    if (tokenData) {
      trackingToken = tokenData.token;
    } else {
      // Create new tracking token
      const { data: newToken, error: createError } = await supabase
        .from('delivery_tracking_tokens')
        .insert({ order_id: orderId })
        .select('token')
        .single();

      if (createError || !newToken) {
        throw new Error("Failed to create tracking token");
      }

      trackingToken = newToken.token;
    }

    const trackingUrl = `https://trustlinkcompany.com/track?token=${trackingToken}`;
    
    const customerEmail = (order.customers as any)?.email;
    const customerName = (order.customers as any)?.contact_name || (order.customers as any)?.company_name || 'Valued Customer';

    if (!customerEmail) {
      throw new Error("Customer email not found");
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Order is on the Way!</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Your Order is on the Way! 🚚</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Dear ${customerName},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Great news! Your order <strong>#${order.order_number}</strong> has been shipped and is on its way to you.
            </p>

            ${order.tracking_number ? `
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #667eea;">Tracking Information:</p>
                <p style="margin: 5px 0;"><strong>Tracking Number:</strong> ${order.tracking_number}</p>
                ${order.carrier ? `<p style="margin: 5px 0;"><strong>Carrier:</strong> ${order.carrier}</p>` : ''}
                ${order.estimated_delivery_date ? `<p style="margin: 5px 0;"><strong>Estimated Delivery:</strong> ${new Date(order.estimated_delivery_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
              </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackingUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Track Your Order
              </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              You can track your order anytime by clicking the button above or visiting this link:<br>
              <a href="${trackingUrl}" style="color: #667eea; word-break: break-all;">${trackingUrl}</a>
            </p>

            <p style="font-size: 16px; margin-top: 30px;">
              If you have any questions, please don't hesitate to contact us at 
              <a href="mailto:support@trustlinkcompany.com" style="color: #667eea;">support@trustlinkcompany.com</a>
            </p>

            <p style="font-size: 16px; margin-top: 20px;">
              Thank you for choosing Trust Link Ventures!
            </p>

            <p style="font-size: 16px; margin-top: 10px;">
              Best regards,<br>
              <strong>The Trust Link Ventures Team</strong>
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p style="margin: 5px 0;">Trust Link Ventures</p>
            <p style="margin: 5px 0;">Your trusted partner in global food distribution</p>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend
    const { error: emailError } = await resend.emails.send({
      from: "Trust Link Ventures <info@trustlinkcompany.com>",
      to: [customerEmail],
      subject: `Your Order #${order.order_number} is on the Way! 🚚`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

    // Log the email
    await supabase.from('email_logs').insert({
      email_type: 'tracking_link',
      recipient_email: customerEmail,
      order_id: orderId,
      subject: `Your Order #${order.order_number} is on the Way!`,
      status: 'sent',
    });

    console.log("Tracking link sent successfully to:", customerEmail);

    return new Response(
      JSON.stringify({ success: true, trackingUrl }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-tracking-link function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
