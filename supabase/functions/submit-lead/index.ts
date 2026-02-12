import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadSubmissionRequest {
  title: string;
  description?: string;
  source?: string;
  customer_id?: string;
  status?: string;
  value?: number;
  currency?: string;
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
      title,
      description,
      source = 'website',
      customer_id,
      status = 'new',
      value,
      currency = 'USD',
      recaptchaToken
    }: LeadSubmissionRequest = await req.json();

    console.log('Lead submission request:', { title, source });

    // Basic validation
    if (!title || title.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (title.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Title must be less than 200 characters' }),
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
      .rpc('check_lead_rate_limit', { p_ip_address: ipAddress });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    } else if (rateLimitCheck === false) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many lead submissions from your location. Please try again in an hour.' 
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
      recaptcha_verified: !!recaptchaToken
    };

    // Resolve tenant_id - use first active tenant for public submissions
    let tenantId: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      // Authenticated user: resolve tenant from tenant_users
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (user) {
        const { data: tu } = await supabase
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        if (tu) tenantId = tu.tenant_id;
      }
    }
    if (!tenantId) {
      // Unauthenticated: use first active tenant
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();
      if (tenant) tenantId = tenant.id;
    }

    // Insert lead with service role (bypasses RLS)
    const { data: lead, error: insertError } = await supabase
      .from('leads')
      .insert({
        title: title.trim(),
        description: description?.trim(),
        source,
        customer_id,
        status,
        value,
        currency,
        ip_address: ipAddress,
        verification_status: 'pending',
        submission_metadata: submissionMetadata,
        tenant_id: tenantId
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting lead:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit lead. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Lead created successfully:', lead.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Thank you! Your inquiry has been submitted successfully.',
        lead_id: lead.id
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
