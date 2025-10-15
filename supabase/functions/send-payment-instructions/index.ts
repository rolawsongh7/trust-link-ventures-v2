import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = 'Trust Link Ventures <info@trustlinkcompany.com>';

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
          <div style="display: inline-block; background: white; border-radius: 50%; width: 70px; height: 70px; margin-bottom: 15px; display: flex; align-items: center; justify-content: center;">
            <svg width="40" height="40" viewBox="0 0 24 24" style="display: block;">
              <path fill="#10b981" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
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
            <h3 style="margin-top: 0; color: #1e40af; margin-bottom: 20px;">Payment Options - Choose ONE Method</h3>
            
            <!-- Option 1: Bank Transfer -->
            <div style="margin-bottom: 25px;">
              <h4 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">Option 1: Bank Transfer</h4>
              <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Bank Name:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right;">Trust Link Bank Ghana</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Account Name:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right;">Trust Link Ventures Limited</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Account Number:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-weight: 600; text-align: right;">1234567890</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Swift Code:</td>
                    <td style="padding: 8px 0; font-family: monospace; font-weight: 600; text-align: right;">TLBKGHAC</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Option 2: Mobile Money -->
            <div style="margin-bottom: 20px;">
              <h4 style="color: #065f46; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">Option 2: Mobile Money (Ghana)</h4>
              <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; color: #065f46;">Account Name:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; font-weight: 600; text-align: right;">Trust Link Ventures Limited</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; color: #065f46;">MTN Mobile Money:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; font-family: monospace; font-weight: 600; text-align: right;">+233 24 123 4567</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; color: #065f46;">Vodafone Cash:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; font-family: monospace; font-weight: 600; text-align: right;">+233 20 123 4567</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #065f46;">AirtelTigo Money:</td>
                    <td style="padding: 8px 0; font-family: monospace; font-weight: 600; text-align: right;">+233 27 123 4567</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Payment Reference -->
            <div style="background-color: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-weight: 600;">
                <strong>IMPORTANT - Payment Reference:</strong> 
                <span style="font-family: monospace; font-size: 16px; color: #dc2626; margin-left: 8px;">${quote.quote_number}</span>
              </p>
              <p style="margin: 8px 0 0 0; color: #92400e; font-size: 13px;">
                Include this reference in your payment to ensure proper processing
              </p>
            </div>
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
              <li style="margin-bottom: 6px;">Choose <strong>ONE</strong> payment method (Bank Transfer OR Mobile Money)</li>
              <li style="margin-bottom: 6px;">Payment must be received within <strong>7 days</strong> to maintain pricing</li>
              <li style="margin-bottom: 6px;">Upload proof of payment in your customer portal after completing the transfer</li>
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
          Email: info@trustlinkcompany.com<br>
          Phone: +233 123 456 789</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            This is an automated message. Please do not reply to this email.<br>
            For support, contact info@trustlinkcompany.com
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

    // Send admin notification
    console.log('[Payment Instructions] Sending admin notification to info@trustlinkcompany.com');
    
    try {
      const adminEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Quote Approved - Action Required</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Customer approved quote and received payment instructions</p>
          </div>
          
          <div style="padding: 30px;">
            <div style="background: linear-gradient(135deg, #dcfce7, #bbf7d0); border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 6px;">
              <h3 style="margin: 0 0 10px 0; color: #15803d;">📋 Quote Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Quote Number:</td>
                  <td style="padding: 8px 0; font-weight: 700; text-align: right;">${quote.quote_number}</td>
                </tr>
                ${order ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Order Number:</td>
                  <td style="padding: 8px 0; font-weight: 700; text-align: right;">${order.order_number}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Customer:</td>
                  <td style="padding: 8px 0; font-weight: 600; text-align: right;">${customerName || quote.customers?.contact_name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Company:</td>
                  <td style="padding: 8px 0; font-weight: 600; text-align: right;">${quote.customers?.company_name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Customer Email:</td>
                  <td style="padding: 8px 0; font-weight: 600; text-align: right;">${customerEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Total Amount:</td>
                  <td style="padding: 8px 0; font-size: 20px; font-weight: 700; color: #10b981; text-align: right;">${quote.currency} ${quote.total_amount.toLocaleString()}</td>
                </tr>
              </table>
            </div>

            <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 6px;">
              <h4 style="margin: 0 0 10px 0; color: #92400e;">⚠️ Next Steps Required:</h4>
              <ol style="margin: 0; padding-left: 20px; color: #78350f;">
                <li style="margin-bottom: 8px;">Monitor for incoming payment with reference: <strong>${quote.quote_number}</strong></li>
                <li style="margin-bottom: 8px;">Verify payment amount: <strong>${quote.currency} ${quote.total_amount.toLocaleString()}</strong></li>
                <li style="margin-bottom: 8px;">Once payment confirmed, update order status to "payment_received"</li>
                <li style="margin-bottom: 8px;">Begin order processing and procurement</li>
              </ol>
            </div>

            <div style="margin: 30px 0;">
              <h4 style="color: #1e40af; margin-bottom: 15px;">Order Items Summary:</h4>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f1f5f9;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1;">Item</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 2px solid #cbd5e1;">Qty</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #cbd5e1;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${quote.quote_items.map((item: any) => `
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                        <div style="font-weight: 600;">${item.product_name}</div>
                        ${item.specifications ? `<div style="font-size: 12px; color: #666;">${item.specifications}</div>` : ''}
                      </td>
                      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity} ${item.unit}</td>
                      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${quote.currency} ${item.total_price.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://trustlinkventureslimited.lovable.app/admin/orders" 
                 style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 10px;">
                View Order in Dashboard
              </a>
              <a href="mailto:${customerEmail}" 
                 style="display: inline-block; background-color: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Contact Customer
              </a>
            </div>

            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              <strong>Note:</strong> This is an automated notification. The customer has received payment instructions and is waiting to make payment.
            </p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
              Trust Link Ventures - Internal Admin Notification<br>
              This email was sent to info@trustlinkventureslimited.com
            </p>
          </div>
        </div>
      `;

      const adminEmailResponse = await resend.emails.send({
        from: FROM_EMAIL,
        to: ['info@trustlinkcompany.com'],
        subject: `[ADMIN] Quote Approved: ${quote.quote_number} - ${customerName || quote.customers?.contact_name || 'Customer'}`,
        html: adminEmailHtml,
      });

      if (adminEmailResponse.error) {
        console.error('[Admin Notification] Failed to send:', adminEmailResponse.error);
        await logEmailAttempt({
          email_type: 'payment_instructions_admin',
          recipient_email: 'info@trustlinkcompany.com',
          subject: `[ADMIN] Quote Approved: ${quote.quote_number}`,
          status: 'failed',
          error_message: adminEmailResponse.error.message || JSON.stringify(adminEmailResponse.error),
          quote_id: quoteId,
          order_id: order?.id,
          metadata: { quote_number: quote.quote_number, order_number: order?.order_number },
        });
      } else {
        console.log('[Admin Notification] Email sent successfully:', adminEmailResponse.data);
        await logEmailAttempt({
          email_type: 'payment_instructions_admin',
          recipient_email: 'info@trustlinkcompany.com',
          subject: `[ADMIN] Quote Approved: ${quote.quote_number}`,
          status: 'sent',
          resend_id: adminEmailResponse.data?.id,
          quote_id: quoteId,
          order_id: order?.id,
          metadata: { 
            quote_number: quote.quote_number, 
            order_number: order?.order_number,
            customer_email: customerEmail,
            resend_response: adminEmailResponse.data
          },
        });
      }
    } catch (adminEmailError) {
      console.error('[Admin Notification] Exception while sending admin email:', adminEmailError);
      // Don't fail the main request if admin email fails
    }

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
