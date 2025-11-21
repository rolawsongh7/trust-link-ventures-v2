import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { authenticator } from 'npm:otplib@12.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyMFARequest {
  userId: string;
  token: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Parse request body
    const { userId, token: mfaToken } = await req.json() as VerifyMFARequest;

    // Verify the user is trying to verify their own MFA
    if (user.id !== userId) {
      console.error('User mismatch:', { authUserId: user.id, requestUserId: userId });
      throw new Error('Unauthorized');
    }

    // Rate limiting: Check failed attempts in last minute
    const { data: recentAttempts, error: attemptError } = await supabaseClient
      .from('mfa_login_attempts')
      .select('id')
      .eq('user_id', userId)
      .eq('success', false)
      .gte('attempt_time', new Date(Date.now() - 60000).toISOString());

    if (attemptError) {
      console.error('Error checking rate limit:', attemptError);
    } else if (recentAttempts && recentAttempts.length >= 5) {
      console.warn('Rate limit exceeded for user:', userId);
      
      // Log rate limit event
      await supabaseClient.from('audit_logs').insert({
        user_id: userId,
        event_type: 'mfa_rate_limit_exceeded',
        severity: 'medium',
        event_data: { attempts_count: recentAttempts.length }
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many failed attempts. Please try again in 60 seconds.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Retrieve MFA secret from database
    const { data: mfaSettings, error: mfaError } = await supabaseClient
      .from('user_mfa_settings')
      .select('secret, enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (mfaError) {
      console.error('Error retrieving MFA settings:', mfaError);
      throw new Error('Failed to retrieve MFA settings');
    }

    if (!mfaSettings || !mfaSettings.enabled) {
      console.error('MFA not enabled for user:', userId);
      
      // Log failed attempt
      await supabaseClient.from('mfa_login_attempts').insert({
        user_id: userId,
        success: false
      });

      return new Response(
        JSON.stringify({ success: false, error: 'MFA not enabled for this user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the TOTP token with time window tolerance (±60 seconds)
    authenticator.options = { window: 2 }; // 2 time steps = ±60 seconds
    const isValid = authenticator.verify({ 
      token: mfaToken, 
      secret: mfaSettings.secret 
    });
    authenticator.resetOptions();

    // Log the attempt
    await supabaseClient.from('mfa_login_attempts').insert({
      user_id: userId,
      success: isValid
    });

    if (isValid) {
      console.log('MFA token verified successfully for user:', userId);
      
      // Log successful verification
      await supabaseClient.from('audit_logs').insert({
        user_id: userId,
        event_type: 'mfa_verification_success',
        severity: 'low',
        event_data: { timestamp: new Date().toISOString() }
      });
    } else {
      console.warn('Invalid MFA token for user:', userId);
      
      // Log failed verification
      await supabaseClient.from('audit_logs').insert({
        user_id: userId,
        event_type: 'mfa_verification_failed',
        severity: 'medium',
        event_data: { timestamp: new Date().toISOString() }
      });
    }

    return new Response(
      JSON.stringify({ success: isValid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-mfa-token function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
