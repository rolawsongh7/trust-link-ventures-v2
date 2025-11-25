import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  email: string;
  name?: string;
  sourceType: 'quote_request' | 'lead' | 'customer' | 'manual';
  sourceId?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get auth token from request
    const authHeader = req.headers.get('Authorization')!;
    
    // Initialize Supabase client for auth check
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { email, name, sourceType, sourceId, metadata }: InviteRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize admin client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user already exists or has pending invitation
    const { data: inviteStatus } = await supabase.rpc('check_user_invitation_status', {
      p_email: email
    });

    if (inviteStatus?.user_exists) {
      return new Response(
        JSON.stringify({ error: 'User with this email already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (inviteStatus?.pending_invitation) {
      return new Response(
        JSON.stringify({ error: 'An invitation has already been sent to this email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send invitation using admin client
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: name || '',
          invited_by: user.id,
          source_type: sourceType,
          source_id: sourceId,
        },
        redirectTo: `${req.headers.get('origin') || supabaseUrl}/auth/callback`,
      }
    );

    if (inviteError) {
      console.error('Invitation error:', inviteError);
      return new Response(
        JSON.stringify({ error: `Failed to send invitation: ${inviteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log invitation in database
    const { error: logError } = await supabase
      .from('user_invitations')
      .insert({
        email,
        invited_by: user.id,
        source_type: sourceType,
        source_id: sourceId,
        metadata: {
          ...metadata,
          name,
          invited_user_id: inviteData?.user?.id,
        },
      });

    if (logError) {
      console.error('Failed to log invitation:', logError);
      // Don't fail the request, invitation was already sent
    }

    // Log in audit logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      event_type: 'user_invited',
      action: 'invite',
      resource_type: 'user_invitation',
      resource_id: email,
      event_data: {
        email,
        source_type: sourceType,
        source_id: sourceId,
        name,
      },
      severity: 'low',
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${email}`,
        invitedUserId: inviteData?.user?.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
