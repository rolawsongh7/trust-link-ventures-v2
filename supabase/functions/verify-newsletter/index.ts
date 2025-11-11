import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsletterSubscriptionRequest {
  email: string;
  source?: string;
  recaptchaToken?: string;
}

// Initialize Resend
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyRecaptcha(token: string): Promise<boolean> {
  try {
    const recaptchaSecret = Deno.env.get('RECAPTCHA_SECRET_KEY');
    if (!recaptchaSecret) {
      console.warn('RECAPTCHA_SECRET_KEY not configured, skipping verification');
      return true; // Allow if not configured
    }

    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${recaptchaSecret}&response=${token}`,
      }
    );

    const data = await response.json();
    return data.success === true; // reCAPTCHA v2 only returns success true/false
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

async function getClientIP(req: Request): Promise<string> {
  // Try to get real IP from headers (considering proxies)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return '0.0.0.0'; // Fallback
}

async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  try {
    const verificationUrl = `https://ppyfrftmexvgnsxlhdbz.supabase.co/functions/v1/verify-newsletter-confirm?token=${token}`;
    
    const { error } = await resend.emails.send({
      from: 'Trust Link Ventures <noreply@trustlinkcompany.com>',
      to: [email],
      subject: 'Confirm Your Newsletter Subscription',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #1e40af; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Welcome to Trust Link Ventures</h1>
            </div>
            
            <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Thank you for subscribing to our newsletter! We're excited to keep you updated on premium food products and export opportunities.
              </p>
              
              <p style="font-size: 16px; margin-bottom: 30px;">
                Please confirm your email address by clicking the button below:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background-color: #1e40af; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Confirm Subscription
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                This link will expire in 24 hours. If you didn't subscribe to our newsletter, you can safely ignore this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
                Trust Link Ventures Limited<br>
                P.O. Box 709, Adabraka, Accra, Ghana<br>
                <a href="mailto:info@trustlinkcompany.com" style="color: #1e40af;">info@trustlinkcompany.com</a>
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending verification email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, source = 'footer', recaptchaToken }: NewsletterSubscriptionRequest = await req.json();

    console.log('Newsletter subscription request:', { email, source });

    // Verify reCAPTCHA
    if (recaptchaToken) {
      const isValidRecaptcha = await verifyRecaptcha(recaptchaToken);
      if (!isValidRecaptcha) {
        return new Response(
          JSON.stringify({ error: 'reCAPTCHA verification failed. Please try again.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get client IP for rate limiting
    const ipAddress = await getClientIP(req);
    console.log('Client IP:', ipAddress);

    // Check rate limit
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc('check_newsletter_rate_limit', { p_ip_address: ipAddress });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    } else if (rateLimitCheck === false) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many subscription attempts from your location. Please try again in an hour.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();

    // Insert subscription (status will be 'pending' by default)
    const { data: subscription, error: insertError } = await supabase
      .from('newsletter_subscriptions')
      .insert({
        email,
        source,
        verified: false,
        verification_token: verificationToken,
        verification_sent_at: new Date().toISOString(),
        ip_address: ipAddress,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting subscription:', insertError);
      
      // Handle duplicate email
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ 
            error: 'This email is already subscribed to our newsletter.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to process subscription. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationToken);

    if (!emailSent) {
      // Delete the subscription if email fails
      await supabase
        .from('newsletter_subscriptions')
        .delete()
        .eq('id', subscription.id);

      return new Response(
        JSON.stringify({ 
          error: 'Failed to send verification email. Please try again later.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verification email sent successfully to:', email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Please check your email to confirm your subscription.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

Deno.serve(handler);
