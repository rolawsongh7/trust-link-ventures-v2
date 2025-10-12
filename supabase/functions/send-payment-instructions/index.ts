import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = 'Trust Link Ventures <info@trustlinkventureslimited.com>';

interface SendPaymentInstructionsRequest {
  quoteId: string;
  customerEmail: string;
  customerName?: string;
  orderNumber?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function logEmailAttempt(
  data: {
    email_type: string;
    recipient_email: string;
    subject: string;
    status: string;
    error_message?: string;
    resend_id?: string;
    quote_id?: string;
    order_id?: string;
    metadata?: any;
  }
) {
  try {
    const { error } = await supabase
      .from('email_logs')
      .insert({
        email_type: data.email_type,
        recipient_email: data.recipient_email,
        subject: data.subject,
        status: data.status,
        error_message: data.error_message,
        resend_id: data.resend_id,
        quote_id: data.quote_id,
        order_id: data.order_id,
        metadata: data.metadata || {},
      });
    
    if (error) {
      console.error('[Email Logging] Failed to log email attempt:', error);
    }
  } catch (err) {
    console.error('[Email Logging] Exception while logging email:', err);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quoteId, customerEmail, customerName, orderNumber }: SendPaymentInstructionsRequest = await req.json();

    console.log(`[Payment Instructions] Sending email for quote ${quoteId} to ${customerEmail}`);
    
    if (!quoteId || !customerEmail) {
      throw new Error('Missing required fields: quoteId and customerEmail are required');
    }

    // Get quote details
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customers(company_name, contact_name),
        quote_items(*)
      `)
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      console.error('[Payment Instructions] Quote fetch error:', quoteError);
      throw new Error(`Quote not found: ${quoteError?.message}`);
    }

    // Get order if it was created
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('quote_id', quoteId)
      .single();

    console.log(`[Payment Instructions] Quote found: ${quote.quote_number}`, order ? `Order: ${order.order_number}` : '');

    // Prepare quote items for email
    const itemsHtml = quote.quote_items.map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <div style="font-weight: 600;">${item.product_name}</div>
          ${item.product_description ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${item.product_description}</div>` : ''}
          ${item.specifications ? `<div style="font-size: 12px; color: #666; font-style: italic; margin-top: 2px;">${item.specifications}</div>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; white-space: nowrap;">${item.quantity} ${item.unit}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${quote.currency} ${item.unit_price.toLocaleString()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${quote.currency} ${item.total_price.toLocaleString()}</td>
      </tr>
    `).join('');

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center;">
          <div style="display: inline-block; background: white; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; margin-bottom: 15px;">
            <span style="color: #10b981; font-size: 36px; font-weight: bold;">✓</span>
          </div>
          <h1 style="color: white; margin: 0; font-size: 28px;">Quote Approved!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Payment Instructions</p>
        </div>
        
        <div style="padding: 30px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${customerName || 'Valued Customer'},</p>
          
          <p style="margin-bottom: 20px;">Thank you for approving quote <strong>${quote.quote_number}</strong>! ${order ? `We have created order <strong>${order.order_number}</strong> for you.` : ''}</p>
          
          <div style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
            <div style="color: #1e40af; font-size: 14px; margin-bottom: 8px;">Total Amount Due</div>
            <div style="color: #1e40af; font-size: 32px; font-weight: bold;">${quote.currency} ${quote.total_amount.toLocaleString()}</div>
          </div>

          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e40af; display: flex; align-items: center; gap: 8px;">
              <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Bank Transfer Details
            </h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Bank Name:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right;">Trust Link Bank Ghana</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Account Name:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right;">Trust Link Ventures Limited</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Account Number:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-weight: 600; text-align: right;">1234567890</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Swift Code:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-weight: 600; text-align: right;">TLBKGHAC</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6b7280;">Payment Reference:</td>
                <td style="padding: 10px 0; font-family: monospace; font-weight: 700; color: #dc2626; text-align: right;">${quote.quote_number}</td>
              </tr>
            </table>
          </div>

          <div style="margin: 20px 0;">
            <h4 style="color: #1e40af; margin-bottom: 10px;">Order Summary</h4>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background-color: #f1f5f9;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 600;">Item</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 600;">Quantity</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 600;">Unit Price</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 600;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot style="background-color: #f1f5f9;">
                <tr>
                  <td colspan="3" style="padding: 15px; text-align: right; border-top: 2px solid #cbd5e1; font-weight: 700;">Total Amount:</td>
                  <td style="padding: 15px; text-align: right; border-top: 2px solid #cbd5e1;">
                    <span style="font-size: 18px; font-weight: 700; color: #10b981;">${quote.currency} ${quote.total_amount.toLocaleString()}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style="background: linear-gradient(135deg, #dbeafe, #e0f2fe); border-left: 4px solid #0ea5e9; padding: 15px; margin: 25px 0; border-radius: 6px;">
            <h4 style="margin: 0 0 10px 0; color: #0c4a6e; font-size: 16px;">⚠️ Important Payment Notes:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #0c4a6e;">
              <li style="margin-bottom: 6px;"><strong>MUST include reference:</strong> ${quote.quote_number} in your payment transfer</li>
              <li style="margin-bottom: 6px;">Payment must be received within <strong>7 days</strong> to maintain pricing</li>
              <li style="margin-bottom: 6px;">You will receive confirmation email once payment is verified</li>
              <li style="margin-bottom: 6px;">Processing begins immediately after payment confirmation</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://ppyfrftmexvgnsxlhdbz.supabase.co/functions/v1/customer/quotes" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              View Order Status
            </a>
          </div>
          
          <p style="margin-top: 30px;">If you have any questions about payment or your order, please contact us.</p>
          
          <p style="margin-bottom: 0;">Best regards,<br>
          <strong>Trust Link Ventures Team</strong><br>
          Email: info@trustlinkventures.com<br>
          Phone: +233 123 456 789</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            This is an automated message. Please do not reply to this email.<br>
            For support, contact info@trustlinkventures.com
          </p>
        </div>
      </div>
    `;

    console.log(`[Payment Instructions] Sending email via Resend to ${customerEmail}`);
    
    const emailResponse = await resend.emails.send({
      from: FROM_EMAIL,
      to: [customerEmail],
      subject: `Payment Instructions - Quote ${quote.quote_number} Approved`,
      html: emailHtml,
    });

    if (emailResponse.error) {
      console.error('[Payment Instructions] Resend API error:', emailResponse.error);
      await logEmailAttempt({
        email_type: 'payment_instructions',
        recipient_email: customerEmail,
        subject: `Payment Instructions - Quote ${quote.quote_number} Approved`,
        status: 'failed',
        error_message: emailResponse.error.message || JSON.stringify(emailResponse.error),
        quote_id: quoteId,
        order_id: order?.id,
        metadata: { quote_number: quote.quote_number, order_number: order?.order_number },
      });
      throw new Error(`Resend API error: ${emailResponse.error.message}`);
    }

    console.log('[Payment Instructions] Email sent successfully:', emailResponse.data);
    
    await logEmailAttempt({
      email_type: 'payment_instructions',
      recipient_email: customerEmail,
      subject: `Payment Instructions - Quote ${quote.quote_number} Approved`,
      status: 'sent',
      resend_id: emailResponse.data?.id,
      quote_id: quoteId,
      order_id: order?.id,
      metadata: { 
        quote_number: quote.quote_number, 
        order_number: order?.order_number,
        resend_response: emailResponse.data
      },
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Payment instructions sent successfully",
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('[Payment Instructions] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send payment instructions email'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
