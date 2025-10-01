import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verified domain for email sending
const FROM_EMAIL = 'Trust Link Ventures <noreply@trustlinkventures.com>';

interface SendQuoteApprovalRequest {
  quoteId: string;
  customerEmail: string;
  customerName?: string;
  companyName?: string;
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Helper function to log email attempts to database
async function logEmailAttempt(
  data: {
    email_type: string;
    recipient_email: string;
    subject: string;
    status: string;
    error_message?: string;
    resend_id?: string;
    quote_id?: string;
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
        metadata: data.metadata || {},
      });
    
    if (error) {
      console.error('[Email Logging] Failed to log email attempt:', error);
    }
  } catch (err) {
    console.error('[Email Logging] Exception while logging email:', err);
  }
}

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
    const { quoteId, customerEmail, customerName, companyName }: SendQuoteApprovalRequest = await req.json();

    console.log(`[Quote Approval] Starting email send for quote ${quoteId} to ${customerEmail}`);
    
    // Validate inputs
    if (!quoteId || !customerEmail) {
      throw new Error('Missing required fields: quoteId and customerEmail are required');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      throw new Error(`Invalid email format: ${customerEmail}`);
    }

    // Generate secure token
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

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
      console.error('[Quote Approval] Quote fetch error:', quoteError);
      await logEmailAttempt({
        email_type: 'quote_approval',
        recipient_email: customerEmail,
        subject: `Quote Approval: ${quoteId}`,
        status: 'failed',
        error_message: `Quote not found: ${quoteError?.message}`,
        quote_id: quoteId,
      });
      throw new Error(`Quote not found: ${quoteError?.message}`);
    }
    
    console.log(`[Quote Approval] Quote found: ${quote.quote_number}`);

    // Store magic link token
    const { error: tokenError } = await supabase
      .from('magic_link_tokens')
      .insert({
        quote_id: quoteId,
        token: token,
        token_type: 'quote_approval',
        expires_at: expiresAt.toISOString(),
        supplier_email: customerEmail, // reusing this field for customer email
        metadata: { 
          quote_number: quote.quote_number,
          customer_name: customerName,
          company_name: companyName 
        }
      });

    if (tokenError) {
      console.error('[Quote Approval] Token creation error:', tokenError);
      await logEmailAttempt({
        email_type: 'quote_approval',
        recipient_email: customerEmail,
        subject: `Quote Approval Request: ${quote.quote_number}`,
        status: 'failed',
        error_message: `Token creation failed: ${tokenError.message}`,
        quote_id: quoteId,
      });
      throw new Error(`Failed to create token: ${tokenError.message}`);
    }
    
    console.log(`[Quote Approval] Magic link token created successfully`);

    // Update quote with customer email if not already set
    if (!quote.customer_email) {
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ customer_email: customerEmail })
        .eq('id', quoteId);
      
      if (updateError) {
        console.error('[Quote Approval] Warning - Failed to update customer_email:', updateError);
      }
    }

    // Create approval and rejection links
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '') + '.supabase.co';
    const approvalLink = `${baseUrl}/functions/v1/quote-approval?token=${token}&action=approve`;
    const rejectionLink = `${baseUrl}/functions/v1/quote-approval?token=${token}&action=reject`;

    // Prepare quote items for email
    const itemsHtml = quote.quote_items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity} ${item.unit}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${quote.currency} ${item.unit_price.toLocaleString()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${quote.currency} ${item.total_price.toLocaleString()}</td>
      </tr>
    `).join('');

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Quote Approval Request</h1>
        </div>
        
        <div style="padding: 30px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${customerName || 'Valued Customer'},</p>
          
          <p style="margin-bottom: 20px;">We have prepared a quote for your consideration. Please review the details below:</p>
          
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e40af;">Quote Details</h3>
            <p><strong>Quote Number:</strong> ${quote.quote_number}</p>
            <p><strong>Title:</strong> ${quote.title}</p>
            ${quote.description ? `<p><strong>Description:</strong> ${quote.description}</p>` : ''}
            <p><strong>Valid Until:</strong> ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'N/A'}</p>
          </div>

          <div style="margin: 20px 0;">
            <h4 style="color: #1e40af; margin-bottom: 10px;">Quote Items</h4>
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
                  <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd;">${quote.currency} ${quote.total_amount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <p style="margin: 30px 0 20px 0; font-weight: 500;">Please choose one of the following options:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${approvalLink}" 
               style="display: inline-block; background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">
              ✓ APPROVE QUOTE
            </a>
            <a href="${rejectionLink}" 
               style="display: inline-block; background-color: #ef4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">
              ✗ REJECT QUOTE
            </a>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;"><strong>Important:</strong> This link will expire in 30 days. If you need more time to review, please contact us.</p>
          </div>
          
          <p style="margin-top: 30px;">If you have any questions about this quote, please don't hesitate to contact us.</p>
          
          <p style="margin-bottom: 0;">Best regards,<br>
          <strong>Trust Link Ventures Team</strong><br>
          Email: info@trustlinkventures.com<br>
          Phone: +233 123 456 789</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    console.log(`[Quote Approval] Attempting to send email via Resend to ${customerEmail}`);
    
    // Send email with approval/rejection links
    const emailResponse = await resend.emails.send({
      from: FROM_EMAIL,
      to: [customerEmail],
      subject: `Quote Approval Request: ${quote.quote_number}`,
      html: emailHtml,
    });

    if (emailResponse.error) {
      console.error('[Quote Approval] Resend API error:', emailResponse.error);
      await logEmailAttempt({
        email_type: 'quote_approval',
        recipient_email: customerEmail,
        subject: `Quote Approval Request: ${quote.quote_number}`,
        status: 'failed',
        error_message: emailResponse.error.message || JSON.stringify(emailResponse.error),
        quote_id: quoteId,
        metadata: { quote_number: quote.quote_number, customer_name: customerName },
      });
      throw new Error(`Resend API error: ${emailResponse.error.message || JSON.stringify(emailResponse.error)}`);
    }

    console.log('[Quote Approval] Email sent successfully via Resend:', emailResponse.data);
    
    // Log successful email send
    await logEmailAttempt({
      email_type: 'quote_approval',
      recipient_email: customerEmail,
      subject: `Quote Approval Request: ${quote.quote_number}`,
      status: 'sent',
      resend_id: emailResponse.data?.id,
      quote_id: quoteId,
      metadata: { 
        quote_number: quote.quote_number, 
        customer_name: customerName,
        resend_response: emailResponse.data
      },
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Quote approval email sent successfully",
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('[Quote Approval] Critical error:', error);
    console.error('[Quote Approval] Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send quote approval email. Please check logs for details.'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);