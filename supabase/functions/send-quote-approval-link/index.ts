import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verified domain for email sending
const FROM_EMAIL = 'Trust Link Ventures <info@trustlinkcompany.com>';

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

    // Generate PDF first by invoking the generate-quote-title-page function
    console.log(`[Quote Approval] Generating PDF for quote ${quoteId}`);
    
    let pdfUrl = quote.final_file_url;
    
    // Only generate PDF if it doesn't exist
    if (!pdfUrl) {
      try {
        const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-quote-title-page', {
          body: { quoteId }
        });

        if (pdfError) {
          console.error('[Quote Approval] PDF generation error:', pdfError);
          // Continue without PDF - don't fail the email
        } else if (pdfData?.file_url) {
          pdfUrl = pdfData.file_url;
          console.log('[Quote Approval] PDF generated successfully:', pdfUrl);
        }
      } catch (pdfGenError) {
        console.error('[Quote Approval] Exception during PDF generation:', pdfGenError);
        // Continue without PDF
      }
    } else {
      console.log('[Quote Approval] Using existing PDF:', pdfUrl);
    }

    // Create customer portal link
    const portalUrl = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}.supabase.co`;
    const customerPortalLink = `${portalUrl}/customer-portal/quotes`;

    // Prepare quote items summary (simple list)
    const itemsSummary = quote.quote_items.map((item: any) => 
      `• ${item.product_name} - ${item.quantity} ${item.unit} @ ${quote.currency} ${item.unit_price.toLocaleString()}`
    ).join('\n');

    // Plain text version
    const textContent = `
Dear ${customerName || 'Valued Customer'},

We have prepared a quote for your consideration.

QUOTE DETAILS:
Quote Number: ${quote.quote_number}
Title: ${quote.title}
${quote.description ? 'Description: ' + quote.description : ''}
Valid Until: ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'N/A'}
Total Amount: ${quote.currency} ${quote.total_amount.toLocaleString()}

ITEMS:
${itemsSummary}

To view the complete quote details and respond, please sign in to your customer portal:
${customerPortalLink}

Once you sign in, you can:
- Download the quote PDF
- Approve or reject the quote
- Receive payment instructions (if approved)

If you have any questions, please contact us.

Best regards,
Trust Link Ventures Team
Email: info@trustlinkventures.com
Phone: +233 123 456 789

---
This is an automated message from Trust Link Ventures Limited.
`;

    // Simple HTML email (minimal styling to avoid spam triggers)
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #1e40af; padding: 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Quote Available</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px;">
                      <p style="margin: 0 0 20px 0; color: #333333;">Dear ${customerName || 'Valued Customer'},</p>
                      
                      <p style="margin: 0 0 20px 0; color: #333333;">We have prepared a quote for your consideration.</p>
                      
                      <!-- Quote Details -->
                      <table width="100%" cellpadding="10" style="border: 1px solid #e5e7eb; border-radius: 4px; margin: 20px 0;">
                        <tr>
                          <td style="background-color: #f9fafb; padding: 15px;">
                            <p style="margin: 0 0 10px 0; color: #111827;"><strong>Quote Number:</strong> ${quote.quote_number}</p>
                            <p style="margin: 0 0 10px 0; color: #111827;"><strong>Title:</strong> ${quote.title}</p>
                            ${quote.description ? `<p style="margin: 0 0 10px 0; color: #111827;"><strong>Description:</strong> ${quote.description}</p>` : ''}
                            <p style="margin: 0 0 10px 0; color: #111827;"><strong>Valid Until:</strong> ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'N/A'}</p>
                            <p style="margin: 0; color: #111827; font-size: 18px;"><strong>Total Amount:</strong> ${quote.currency} ${quote.total_amount.toLocaleString()}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${customerPortalLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Quote in Portal</a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Instructions -->
                      <table width="100%" cellpadding="15" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; margin: 20px 0;">
                        <tr>
                          <td>
                            <p style="margin: 0; color: #1e40af;"><strong>Next Steps:</strong></p>
                            <p style="margin: 10px 0 0 0; color: #1e40af;">Sign in to your customer portal to download the quote PDF, approve or reject the quote, and receive payment instructions if you approve.</p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 20px 0 0 0; color: #666666;">If you have any questions about this quote, please contact us.</p>
                      
                      <p style="margin: 20px 0 0 0; color: #333333;">
                        Best regards,<br>
                        <strong>Trust Link Ventures Team</strong><br>
                        Email: info@trustlinkventures.com<br>
                        Phone: +233 123 456 789
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #6b7280; font-size: 12px;">
                        This is an automated transactional message from Trust Link Ventures Limited.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    console.log(`[Quote Approval] Attempting to send email via Resend to ${customerEmail}`);
    
    // Send simplified email with proper headers to avoid spam
    const emailResponse = await resend.emails.send({
      from: FROM_EMAIL,
      to: [customerEmail],
      subject: `New Quote Available for Review - ${quote.quote_number}`,
      html: emailHtml,
      text: textContent,
      headers: {
        'X-Entity-Ref-ID': quote.quote_number,
        'List-Unsubscribe': '<mailto:unsubscribe@trustlinkventureslimited.com>',
      },
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
      subject: `New Quote Available for Review - ${quote.quote_number}`,
      status: 'sent',
      resend_id: emailResponse.data?.id,
      quote_id: quoteId,
      metadata: { 
        quote_number: quote.quote_number, 
        customer_name: customerName,
        pdf_url: pdfUrl || null,
        resend_response: emailResponse.data
      },
    });

    // Send copy to admin email
    console.log('[Admin Copy] Sending copy to info@trustlinkcompany.com...');
    try {
      const adminEmailResponse = await resend.emails.send({
        from: FROM_EMAIL,
        to: ['info@trustlinkcompany.com'],
        subject: `[ADMIN COPY] Quote Sent: ${quote.quote_number} - ${companyName || customerEmail}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: #0066cc; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="color: white; margin: 0;">📧 Admin Notification - Quote Sent</h2>
            </div>
            <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p style="color: #666; margin-bottom: 20px;"><strong>This is a copy of the quote sent to the customer.</strong></p>
              
              <div style="background-color: #f0f7ff; padding: 15px; border-left: 4px solid #0066cc; margin-bottom: 20px;">
                <p style="margin: 5px 0;"><strong>Quote Number:</strong> ${quote.quote_number}</p>
                <p style="margin: 5px 0;"><strong>Customer Email:</strong> ${customerEmail}</p>
                <p style="margin: 5px 0;"><strong>Company:</strong> ${companyName || 'N/A'}</p>
                <p style="margin: 5px 0;"><strong>Sent At:</strong> ${new Date().toLocaleString()}</p>
              </div>

              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <h3 style="color: #333; margin-bottom: 15px;">Customer Email Content Below:</h3>
              ${emailHtml}
            </div>
          </div>
        `,
        text: `ADMIN NOTIFICATION - Quote Sent\n\nThis is a copy of the quote sent to: ${customerEmail}\n\nQuote Number: ${quote.quote_number}\nCompany: ${companyName || 'N/A'}\nSent At: ${new Date().toLocaleString()}\n\n---\n\nCUSTOMER EMAIL CONTENT:\n\n${textContent}`,
      });

      console.log('[Admin Copy] Admin email sent successfully:', adminEmailResponse.data?.id);

      // Log admin email
      await logEmailAttempt({
        email_type: 'quote_approval_admin_copy',
        recipient_email: 'info@trustlinkcompany.com',
        subject: `[ADMIN COPY] Quote Sent: ${quote.quote_number}`,
        status: 'sent',
        resend_id: adminEmailResponse.data?.id,
        quote_id: quoteId,
        metadata: { 
          quote_number: quote.quote_number,
          original_recipient: customerEmail,
          company_name: companyName
        }
      });
    } catch (adminEmailError) {
      console.error('[Admin Copy] Failed to send admin notification:', adminEmailError);
      // Don't fail the main request if admin email fails
      await logEmailAttempt({
        email_type: 'quote_approval_admin_copy',
        recipient_email: 'info@trustlinkcompany.com',
        subject: `[ADMIN COPY] Quote Sent: ${quote.quote_number}`,
        status: 'failed',
        error_message: adminEmailError instanceof Error ? adminEmailError.message : 'Unknown error',
        quote_id: quoteId,
        metadata: { 
          quote_number: quote.quote_number,
          original_recipient: customerEmail
        }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Quote approval email sent successfully to customer and admin",
      emailId: emailResponse.data?.id,
      adminEmail: 'info@trustlinkcompany.com'
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