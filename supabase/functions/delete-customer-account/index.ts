import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for user deletion
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the authorization header to verify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's token to verify ownership
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { reason } = await req.json().catch(() => ({ reason: null }));

    console.log(`Starting account deletion for user: ${user.id}, email: ${user.email}`);

    // Get the customer record linked to this user
    const { data: customerUser, error: customerUserError } = await supabaseAdmin
      .from('customer_users')
      .select('customer_id')
      .eq('user_id', user.id)
      .single();

    if (customerUserError && customerUserError.code !== 'PGRST116') {
      console.error('Error finding customer_users:', customerUserError);
    }

    const customerId = customerUser?.customer_id;
    console.log(`Customer ID: ${customerId}`);

    // Log the deletion request
    const { error: logError } = await supabaseAdmin
      .from('account_deletions')
      .insert({
        user_id: user.id,
        deletion_reason: reason,
        scheduled_for: new Date().toISOString(),
        completed_at: null
      });

    if (logError) {
      console.error('Error logging deletion:', logError);
    }

    // Delete user-specific data
    const deletionPromises = [];

    // Delete from user_notifications
    deletionPromises.push(
      supabaseAdmin.from('user_notifications').delete().eq('user_id', user.id)
        .then(r => console.log('Deleted user_notifications:', r.error || 'success'))
    );

    // Delete from notification_preferences
    deletionPromises.push(
      supabaseAdmin.from('notification_preferences').delete().eq('user_id', user.id)
        .then(r => console.log('Deleted notification_preferences:', r.error || 'success'))
    );

    // Delete from user_mfa_settings
    deletionPromises.push(
      supabaseAdmin.from('user_mfa_settings').delete().eq('user_id', user.id)
        .then(r => console.log('Deleted user_mfa_settings:', r.error || 'success'))
    );

    // Delete from mfa_login_attempts
    deletionPromises.push(
      supabaseAdmin.from('mfa_login_attempts').delete().eq('user_id', user.id)
        .then(r => console.log('Deleted mfa_login_attempts:', r.error || 'success'))
    );

    // Delete from password_history
    deletionPromises.push(
      supabaseAdmin.from('password_history').delete().eq('user_id', user.id)
        .then(r => console.log('Deleted password_history:', r.error || 'success'))
    );

    // Delete from privacy_settings
    deletionPromises.push(
      supabaseAdmin.from('privacy_settings').delete().eq('user_id', user.id)
        .then(r => console.log('Deleted privacy_settings:', r.error || 'success'))
    );

    // Delete from consent_history
    deletionPromises.push(
      supabaseAdmin.from('consent_history').delete().eq('user_id', user.id)
        .then(r => console.log('Deleted consent_history:', r.error || 'success'))
    );

    // Delete from network_security_settings
    deletionPromises.push(
      supabaseAdmin.from('network_security_settings').delete().eq('user_id', user.id)
        .then(r => console.log('Deleted network_security_settings:', r.error || 'success'))
    );

    // Delete from anomaly_detection_settings
    deletionPromises.push(
      supabaseAdmin.from('anomaly_detection_settings').delete().eq('user_id', user.id)
        .then(r => console.log('Deleted anomaly_detection_settings:', r.error || 'success'))
    );

    // Delete from device_fingerprints
    deletionPromises.push(
      supabaseAdmin.from('device_fingerprints').delete().eq('user_id', user.id)
        .then(r => console.log('Deleted device_fingerprints:', r.error || 'success'))
    );

    // Delete from cart_items
    deletionPromises.push(
      supabaseAdmin.from('cart_items').delete().eq('user_id', user.id)
        .then(r => console.log('Deleted cart_items:', r.error || 'success'))
    );

    // Delete from ip_whitelist
    deletionPromises.push(
      supabaseAdmin.from('ip_whitelist').delete().eq('user_id', user.id)
        .then(r => console.log('Deleted ip_whitelist:', r.error || 'success'))
    );

    // Delete from file_uploads
    deletionPromises.push(
      supabaseAdmin.from('file_uploads').delete().eq('user_id', user.id)
        .then(r => console.log('Deleted file_uploads:', r.error || 'success'))
    );

    await Promise.all(deletionPromises);

    // If there's a linked customer, handle customer-specific data
    if (customerId) {
      console.log('Processing customer-specific data...');

      // Delete customer addresses
      const { error: addrError } = await supabaseAdmin
        .from('customer_addresses')
        .delete()
        .eq('customer_id', customerId);
      console.log('Deleted customer_addresses:', addrError || 'success');

      // Delete communications
      const { error: commError } = await supabaseAdmin
        .from('communications')
        .delete()
        .eq('customer_id', customerId);
      console.log('Deleted communications:', commError || 'success');

      // Delete activities
      const { error: actError } = await supabaseAdmin
        .from('activities')
        .delete()
        .eq('customer_id', customerId);
      console.log('Deleted activities:', actError || 'success');

      // Anonymize orders (keep for business records but remove PII)
      const { error: ordersError } = await supabaseAdmin
        .from('orders')
        .update({ 
          delivery_notes: null,
          notes: null,
          internal_notes: '[Account Deleted]'
        })
        .eq('customer_id', customerId);
      console.log('Anonymized orders:', ordersError || 'success');

      // Anonymize quote requests
      const { error: qrError } = await supabaseAdmin
        .from('quote_requests')
        .update({
          message: null,
          admin_notes: '[Account Deleted]',
          lead_contact_name: '[Deleted]',
          lead_email: null,
          lead_phone: null
        })
        .eq('customer_id', customerId);
      console.log('Anonymized quote_requests:', qrError || 'success');

      // Anonymize the customer record itself (instead of deleting to preserve FK references)
      const { error: custError } = await supabaseAdmin
        .from('customers')
        .update({
          contact_name: '[Deleted User]',
          email: null,
          phone: null,
          address: null,
          city: null,
          notes: '[Account Deleted]',
          customer_status: 'deleted'
        })
        .eq('id', customerId);
      console.log('Anonymized customer:', custError || 'success');

      // Delete customer_users link
      const { error: cuError } = await supabaseAdmin
        .from('customer_users')
        .delete()
        .eq('customer_id', customerId);
      console.log('Deleted customer_users:', cuError || 'success');
    }

    // Mark deletion as completed
    await supabaseAdmin
      .from('account_deletions')
      .update({ completed_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('completed_at', null);

    // Finally, delete the auth user
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user account', details: deleteUserError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully deleted account for user: ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-customer-account:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
