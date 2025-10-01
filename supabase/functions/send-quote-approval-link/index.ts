import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    console.log('Sending quote approval link for:', { quoteId, customerEmail });

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
      throw new Error(`Quote not found: ${quoteError?.message}`);
    }

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
      throw new Error(`Failed to create token: ${tokenError.message}`);
    }

    // Update quote with customer email if not already set
    if (!quote.customer_email) {
      await supabase
        .from('quotes')
        .update({ customer_email: customerEmail })
        .eq('id', quoteId);
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

    // Send email with approval/rejection links
    const emailResponse = await resend.emails.send({
      from: "SeaPro SAS <onboarding@resend.dev>",
      to: [customerEmail],
      subject: `Quote Approval Required - ${quote.quote_number}`,
      html: `
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
            <strong>SeaPro SAS Team</strong><br>
            Email: quotes@seapro.com<br>
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

    console.log("Quote approval email sent successfully:", emailResponse);

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
    console.error("Error in send-quote-approval-link function:", error);
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