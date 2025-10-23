import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactFormRequest {
  name: string;
  company?: string;
  email: string;
  country: string;
  inquiryType?: string;
  message?: string;
  recaptchaToken?: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// List of disposable/temporary email domains to block
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'tempmail.com',
  'temp-mail.org', 'throwaway.email', 'yopmail.com', 'maildrop.cc',
  'mintemail.com', 'sharklasers.com', 'guerrillamail.info', 'spam4.me',
  'grr.la', 'getnada.com', 'mohmal.com', 'trashmail.com', 'fakeinbox.com'
];

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_EMAIL_DOMAINS.includes(domain) : false;
}

function validateEmail(email: string): { valid: boolean; reason?: string } {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, reason: 'Invalid email format' };
  }
  
  if (email.length < 5 || email.length > 255) {
    return { valid: false, reason: 'Email must be between 5 and 255 characters' };
  }
  
  if (isDisposableEmail(email)) {
    return { valid: false, reason: 'Temporary/disposable email addresses are not allowed' };
  }
  
  return { valid: true };
}

async function verifyRecaptcha(token: string): Promise<boolean> {
  try {
    const recaptchaSecret = Deno.env.get('RECAPTCHA_SECRET_KEY');
    if (!recaptchaSecret) {
      console.warn('RECAPTCHA_SECRET_KEY not configured, skipping verification');
      return true;
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
    return data.success && data.score >= 0.5;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

async function getClientIP(req: Request): Promise<string> {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return '0.0.0.0';
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      name,
      company,
      email,
      country,
      inquiryType,
      message,
      recaptchaToken
    }: ContactFormRequest = await req.json();

    console.log('Contact form submission request:', { name, email, inquiryType });

    // Basic validation
    if (!name || name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Name must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (name.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Name must be less than 100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Email validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return new Response(
        JSON.stringify({ error: emailValidation.reason }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify reCAPTCHA
    if (recaptchaToken) {
      const isValidRecaptcha = await verifyRecaptcha(recaptchaToken);
      if (!isValidRecaptcha) {
        console.warn('reCAPTCHA verification failed');
        return new Response(
          JSON.stringify({ error: 'Security verification failed. Please try again.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get client IP for rate limiting
    const ipAddress = await getClientIP(req);
    console.log('Client IP:', ipAddress);

    // Check rate limit using the database function
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc('check_communication_rate_limit', { p_ip_address: ipAddress });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    } else if (rateLimitCheck === false) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many contact form submissions from your location. Please try again in an hour.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Collect submission metadata for security analysis
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const referrer = req.headers.get('referer') || req.headers.get('referrer') || 'direct';
    
    const submissionMetadata = {
      user_agent: userAgent,
      referrer: referrer,
      ip_address: ipAddress,
      submitted_at: new Date().toISOString(),
      recaptcha_verified: !!recaptchaToken,
      name: name.trim(),
      company: company?.trim() || null,
      country: country.trim(),
      inquiry_type: inquiryType || 'General Contact'
    };

    // Insert communication with service role (bypasses RLS)
    const { data: communication, error: insertError } = await supabase
      .from('communications')
      .insert({
        communication_type: 'email',
        direction: 'inbound',
        subject: `Contact Form: ${inquiryType || 'General Contact'}`,
        content: `Name: ${name}\nEmail: ${email}\nCountry: ${country}\n${company ? `Company: ${company}\n` : ''}${inquiryType ? `Inquiry Type: ${inquiryType}\n` : ''}\n\nMessage:\n${message || 'No message provided'}`,
        communication_date: new Date().toISOString(),
        ip_address: ipAddress,
        verification_status: 'pending',
        submission_metadata: submissionMetadata
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting communication:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit contact form. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Contact form submitted successfully:', communication.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Thank you! We\'ve received your inquiry and will be in touch shortly.',
        communication_id: communication.id
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
