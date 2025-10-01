import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verified domain for email sending
const FROM_EMAIL = 'Trust Link Ventures <noreply@trustlinkventureslimited.com>';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Helper function to log email attempts
async function logEmailAttempt(
  data: {
    email_type: string;
    recipient_email: string;
    subject: string;
    status: string;
    error_message?: string;
    resend_id?: string;
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
        metadata: data.metadata || {},
      });
    
    if (error) {
      console.error('[Email Logging] Failed to log email attempt:', error);
    }
  } catch (err) {
    console.error('[Email Logging] Exception while logging email:', err);
  }
}

interface SendRFQRequest {
  rfqId: string;
  supplierEmails: string[];
  rfqTitle: string;
  rfqDescription?: string;
  deadline?: string;
}

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rfqId, supplierEmails, rfqTitle, rfqDescription, deadline }: SendRFQRequest = await req.json();

    console.log(`[RFQ Magic Links] Sending RFQ ${rfqId} to ${supplierEmails.length} suppliers`);
    
    // Validate inputs
    if (!rfqId || !supplierEmails || supplierEmails.length === 0) {
      throw new Error('Missing required fields: rfqId and supplierEmails are required');
    }

    // Create magic link tokens for each supplier
    const tokens = [];
    for (const email of supplierEmails) {
      const token = generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { error: tokenError } = await supabase
        .from('magic_link_tokens')
        .insert({
          rfq_id: rfqId,
          supplier_email: email,
          token: token,
          expires_at: expiresAt.toISOString(),
          metadata: { rfq_title: rfqTitle }
        });

      if (tokenError) {
        console.error('[RFQ Magic Links] Error creating token:', tokenError);
        throw tokenError;
      }

      tokens.push({ email, token });
    }

    // Send emails to all suppliers
    const emailPromises = tokens.map(async ({ email, token }) => {
      const magicLink = `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/functions/v1/quote-submission?token=${token}`;
      
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New RFQ Request - ${rfqTitle}</h2>
          
          <p>Dear Supplier,</p>
          
          <p>You have received a new Request for Quote (RFQ) from Trust Link Ventures Limited.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">RFQ Details:</h3>
            <p><strong>Title:</strong> ${rfqTitle}</p>
            ${rfqDescription ? `<p><strong>Description:</strong> ${rfqDescription}</p>` : ''}
            ${deadline ? `<p><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString()}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Submit Your Quote
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This link is valid for 7 days and can only be used once. 
            If you have any questions, please contact us at info@trustlinkventures.com
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <div style="color: #6b7280; font-size: 12px;">
            <p><strong>Trust Link Ventures Limited</strong><br>
            Tema, Ghana<br>
            Email: info@trustlinkventures.com</p>
          </div>
        </div>
      `;

      console.log(`[RFQ Magic Links] Sending email to ${email}`);
      
      return resend.emails.send({
        from: FROM_EMAIL,
        to: [email],
        subject: `RFQ: ${rfqTitle} - Submit Your Quote`,
        html: emailContent,
      }).then(async (result) => {
        // Log successful send
        if (result.data) {
          await logEmailAttempt({
            email_type: 'rfq_invitation',
            recipient_email: email,
            subject: `RFQ: ${rfqTitle} - Submit Your Quote`,
            status: 'sent',
            resend_id: result.data.id,
            metadata: { rfq_id: rfqId, rfq_title: rfqTitle, token },
          });
          console.log(`[RFQ Magic Links] Successfully sent to ${email}`);
        }
        return result;
      }).catch(async (error) => {
        // Log failed send
        await logEmailAttempt({
          email_type: 'rfq_invitation',
          recipient_email: email,
          subject: `RFQ: ${rfqTitle} - Submit Your Quote`,
          status: 'failed',
          error_message: error.message || JSON.stringify(error),
          metadata: { rfq_id: rfqId, rfq_title: rfqTitle, token },
        });
        console.error(`[RFQ Magic Links] Failed to send to ${email}:`, error);
        throw error;
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);
    
    const successful = emailResults.filter(result => result.status === 'fulfilled').length;
    const failed = emailResults.filter(result => result.status === 'rejected').length;

    console.log(`[RFQ Magic Links] Email sending completed: ${successful} successful, ${failed} failed`);

    if (failed > 0) {
      const failedReasons = emailResults
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason);
      
      console.error('[RFQ Magic Links] Failed emails details:', failedReasons);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: successful,
        emailsFailed: failed,
        totalSuppliers: supplierEmails.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[RFQ Magic Links] Critical error:', error);
    console.error('[RFQ Magic Links] Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send RFQ invitation emails. Please check logs for details.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});