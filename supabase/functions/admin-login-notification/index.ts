import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminLoginNotificationRequest {
  userId: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  requiresMFA?: boolean;
  location?: {
    country?: string;
    city?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      userId,
      email,
      ipAddress,
      userAgent,
      success,
      requiresMFA,
      location
    }: AdminLoginNotificationRequest = await req.json();

    console.log(`[Admin Login] Processing notification for ${email} - Success: ${success}`);

    // Create audit log entry
    await supabase.from('audit_logs').insert({
      user_id: userId,
      event_type: success ? 'admin_login_success' : 'admin_login_failed',
      action: 'login',
      resource_type: 'admin_portal',
      event_data: {
        email,
        requires_mfa: requiresMFA,
        location: location || {},
        user_agent: userAgent
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      severity: success ? 'low' : 'high'
    });

    // If login failed, record failed attempt
    if (!success) {
      await supabase.from('failed_login_attempts').insert({
        email,
        ip_address: ipAddress,
        user_agent: userAgent,
        reason: 'Invalid credentials'
      });

      // Check for suspicious patterns
      const { data: recentFailures } = await supabase
        .from('failed_login_attempts')
        .select('*')
        .eq('email', email)
        .gte('attempt_time', new Date(Date.now() - 15 * 60 * 1000).toISOString());

      if (recentFailures && recentFailures.length >= 3) {
        // Create security alert
        await supabase.from('security_events').insert({
          user_id: userId,
          event_type: 'brute_force_attempt',
          details: {
            email,
            attempt_count: recentFailures.length,
            ip_addresses: [...new Set(recentFailures.map(f => f.ip_address))]
          },
          ip_address: ipAddress,
          user_agent: userAgent
        });

        console.log(`[Security Alert] Brute force attempt detected for ${email}`);
      }
    }

    // Send email notification if Resend API key is available
    if (resendApiKey && success) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Admin Portal Login Alert</h2>
            <p>A successful login to the admin portal was detected for your account.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>IP Address:</strong> ${ipAddress || 'Unknown'}</p>
              <p style="margin: 5px 0;"><strong>Location:</strong> ${location?.city || 'Unknown'}, ${location?.country || 'Unknown'}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>MFA Required:</strong> ${requiresMFA ? 'Yes' : 'No'}</p>
            </div>
            <p style="color: #666; font-size: 12px;">
              If this wasn't you, please contact your system administrator immediately and change your password.
            </p>
          </div>
        `;

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'TrustLink Security <security@trustlinkcompany.com>',
            to: email,
            subject: '🔐 Admin Portal Login Detected',
            html: emailHtml
          })
        });

        if (!response.ok) {
          console.error('[Email] Failed to send notification:', await response.text());
        } else {
          console.log(`[Email] Login notification sent to ${email}`);
        }
      } catch (emailError) {
        console.error('[Email] Error sending notification:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Notification processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[Admin Login Notification] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
