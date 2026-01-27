import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BalancePaymentRequest {
  orderId: string;
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

    const { orderId }: BalancePaymentRequest = await req.json();

    console.log("Processing balance payment request for order:", orderId);

    // Fetch order details with customer info
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        customers(id, company_name, contact_name, email)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Order fetch error:", orderError);
      throw new Error("Order not found");
    }

    if (!order.customers?.email) {
      throw new Error("Customer email not found");
    }

    const confirmedAmount = order.payment_amount_confirmed || 0;
    const balanceRemaining = order.total_amount - confirmedAmount;

    if (balanceRemaining <= 0) {
      throw new Error("No balance remaining on this order");
    }

    const customerName = order.customers?.contact_name || order.customers?.company_name || "Customer";
    const orderNumber = order.order_number;
    const currency = order.currency;
    const portalLink = `https://trustlinkcompany.com/portal/orders?uploadPayment=${orderId}`;

    // Generate the balance payment request email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #047857 0%, #065f46 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .balance-box { background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          .amount-display { font-size: 24px; font-weight: bold; color: #b45309; }
          .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .label { color: #6b7280; font-weight: 500; }
          .value { color: #111827; font-weight: 600; }
          .button { display: inline-block; padding: 14px 28px; background: #047857; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .button:hover { background: #065f46; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; margin-top: 20px; }
          .bank-details { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Balance Payment Required</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Order #${orderNumber}</p>
          </div>
          
          <div class="content">
            <p>Dear ${customerName},</p>
            
            <p>Thank you for your partial payment on <strong>Order #${orderNumber}</strong>. To complete your order and proceed with shipping, please submit the remaining balance.</p>
            
            <div class="balance-box">
              <h3 style="margin: 0 0 15px 0; color: #92400e;">Payment Summary</h3>
              <div class="info-row">
                <span class="label">Order Total:</span>
                <span class="value">${currency} ${parseFloat(order.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="info-row">
                <span class="label">Amount Received:</span>
                <span class="value">${currency} ${confirmedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="info-row" style="border-bottom: none;">
                <span class="label">Balance Remaining:</span>
                <span class="amount-display">${currency} ${balanceRemaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${portalLink}" class="button">Upload Payment Proof</a>
            </div>

            <div class="bank-details">
              <h4 style="margin: 0 0 10px 0;">Bank Transfer Details</h4>
              <p style="margin: 0; font-size: 14px;">
                <strong>Account Name:</strong> Trust Link Ventures Limited<br>
                <strong>Bank:</strong> Ecobank Ghana<br>
                <strong>Account Number:</strong> 1441002540627<br>
                <strong>SWIFT Code:</strong> EABORAJAXXX
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              <strong>Important:</strong> Your order will be processed and shipped once the full payment is received and verified. Please include your order number (${orderNumber}) as the payment reference.
            </p>
            
            <p style="margin-top: 30px;">If you have any questions, please don't hesitate to contact us.</p>
            
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

    // Send customer email
    const emailResponse = await resend.emails.send({
      from: "Trust Link Ventures <info@trustlinkcompany.com>",
      to: [order.customers.email],
      subject: `Balance Payment Required - Order #${orderNumber}`,
      html: emailHtml,
    });

    console.log("Balance payment request email sent:", emailResponse);

    // Create a notification for the customer
    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: order.customers.id,
        type: "balance_payment_request",
        title: "Balance Payment Required",
        message: `Please complete the balance payment of ${currency} ${balanceRemaining.toLocaleString()} for Order #${orderNumber}`,
        data: {
          order_id: orderId,
          order_number: orderNumber,
          balance_remaining: balanceRemaining,
          currency: currency
        }
      });

    if (notifError) {
      console.warn("Failed to create notification:", notifError);
    }

    // Log the email
    await supabase
      .from("email_logs")
      .insert({
        email_type: "balance_payment_request",
        recipient_email: order.customers.email,
        customer_id: order.customers.id,
        order_id: orderId,
        subject: `Balance Payment Required - Order #${orderNumber}`,
        status: "sent",
        resend_id: emailResponse.data?.id,
        metadata: {
          balance_remaining: balanceRemaining,
          amount_confirmed: confirmedAmount,
          total_amount: order.total_amount
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResponse.data?.id,
        balanceRemaining,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-balance-payment-request function:", error);
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
