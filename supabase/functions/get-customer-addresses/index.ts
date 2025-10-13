import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 get-customer-addresses invoked');
  console.log('📋 Request method:', req.method);
  console.log('📋 Headers:', Object.fromEntries(req.headers));
  
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 Creating Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    console.log('👤 Getting authenticated user...');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError) {
      console.error('❌ Auth error:', userError);
    }
    
    console.log('👤 User:', user?.id || 'None');
    
    if (!user) {
      console.error('❌ No authenticated user');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No user found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔒 Checking admin role...');
    const { data: roleCheck, error: roleError } = await supabaseClient
      .rpc('check_user_role', { check_user_id: user.id, required_role: 'admin' });

    console.log('🔒 Role check result:', roleCheck, 'Error:', roleError);

    if (!roleCheck) {
      console.error('❌ User is not admin');
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📦 Parsing request body...');
    const { customerId } = await req.json();
    console.log('📦 Customer ID:', customerId);

    if (!customerId) {
      console.error('❌ Missing customer ID');
      return new Response(
        JSON.stringify({ error: 'Customer ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔧 Creating service role client...');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('📍 Fetching addresses for customer:', customerId);
    const { data: addresses, error } = await supabaseAdmin
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Successfully fetched ${addresses?.length || 0} addresses`);
    console.log('📍 Addresses:', addresses);

    return new Response(
      JSON.stringify({ addresses }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('💥 Fatal error in get-customer-addresses:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: error.name,
        details: 'Check function logs for full error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
