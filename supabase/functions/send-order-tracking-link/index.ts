import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOrderTrackingRequest {
  orderId: string;
  customerEmail: string;
  customerName?: string;
  companyName?: string;
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, customerEmail, customerName, companyName }: SendOrderTrackingRequest = await req.json();

    console.log('Sending order tracking link for:', { orderId, customerEmail });

    // Generate secure token
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // 90 days expiry for tracking

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customers(company_name, contact_name),
        quotes(quote_number, title),
        order_items(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    // Store magic link token
    const { error: tokenError } = await supabase
      .from('magic_link_tokens')
      .insert({
        order_id: orderId,
        token: token,
        token_type: 'order_tracking',
        expires_at: expiresAt.toISOString(),
        supplier_email: customerEmail, // reusing this field for customer email
        metadata: { 
          order_number: order.order_number,
          customer_name: customerName,
          company_name: companyName 
        }
      });

    if (tokenError) {
      throw new Error(`Failed to create token: ${tokenError.message}`);
    }

    // Create tracking link
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '') + '.supabase.co';
    const trackingLink = `${baseUrl}/functions/v1/order-tracking?token=${token}`;

    // Prepare order items for email
    const itemsHtml = order.order_items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity} ${item.unit}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${order.currency} ${item.unit_price.toLocaleString()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${order.currency} ${item.total_price.toLocaleString()}</td>
      </tr>
    `).join('');

    // Get status display info
    const getStatusInfo = (status: string) => {
      switch (status) {
        case 'pending': return { color: '#f59e0b', text: 'Pending Confirmation' };
        case 'confirmed': return { color: '#3b82f6', text: 'Confirmed' };
        case 'processing': return { color: '#8b5cf6', text: 'Processing' };
        case 'shipped': return { color: '#f97316', text: 'Shipped' };
        case 'delivered': return { color: '#10b981', text: 'Delivered' };
        case 'cancelled': return { color: '#ef4444', text: 'Cancelled' };
        default: return { color: '#6b7280', text: status };
      }
    };

    const statusInfo = getStatusInfo(order.status);

    // Send email with tracking link
    const emailResponse = await resend.emails.send({
      from: "SeaPro SAS <orders@seapro.com>",
      to: [customerEmail],
      subject: `Order Tracking Information - ${order.order_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Order Tracking</h1>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Dear ${customerName || 'Valued Customer'},</p>
            
            <p style="margin-bottom: 20px;">Thank you for your order! You can track your order status using the information below:</p>
            
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e40af;">Order Information</h3>
              <p><strong>Order Number:</strong> ${order.order_number}</p>
              <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
              <div style="display: flex; align-items: center; margin: 10px 0;">
                <strong>Current Status:</strong>
                <span style="margin-left: 10px; padding: 6px 12px; background-color: ${statusInfo.color}; color: white; border-radius: 20px; font-size: 12px; font-weight: bold;">
                  ${statusInfo.text}
                </span>
              </div>
              ${order.quotes ? `<p><strong>From Quote:</strong> ${order.quotes.quote_number}</p>` : ''}
            </div>

            <div style="margin: 20px 0;">
              <h4 style="color: #1e40af; margin-bottom: 10px;">Order Items</h4>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #eee;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Quantity</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Unit Price</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr style="background-color: #f8fafc; font-weight: bold;">
                    <td colspan="3" style="padding: 12px; text-align: right; border-top: 2px solid #ddd;">Total Amount:</td>
                    <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd;">${order.currency} ${order.total_amount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackingLink}" 
                 style="display: inline-block; background-color: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                🔍 TRACK YOUR ORDER
              </a>
            </div>
            
            <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af;"><strong>Bookmark this link!</strong> You can use the tracking link above to check your order status at any time.</p>
            </div>
            
            <p style="margin-top: 30px;">If you have any questions about your order, please don't hesitate to contact us.</p>
            
            <p style="margin-bottom: 0;">Best regards,<br>
            <strong>SeaPro SAS Team</strong><br>
            Email: orders@seapro.com<br>
            Phone: +233 123 456 789</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Order tracking email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Order tracking email sent successfully",
      emailId: emailResponse.data?.id,
      trackingLink: trackingLink
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-order-tracking-link function:", error);
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