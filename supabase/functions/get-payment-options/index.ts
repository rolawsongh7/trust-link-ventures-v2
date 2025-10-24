import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount, currency')
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch payment tier settings
    const { data: settings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('setting_value')
      .eq('setting_key', 'payment_tiers')
      .single();

    if (settingsError) {
      console.error('Error fetching payment settings:', settingsError);
    }

    const tiers = settings?.setting_value || {
      tier1_max: 5000,
      tier2_max: 50000,
      tier3_max: null,
      currency: 'GHS',
      tier1_method: 'paystack',
      tier2_method: 'paystack',
      tier3_method: 'manual'
    };

    const amount = Number(order.total_amount);
    
    // Determine tier and recommended method
    let tier: number;
    let recommended: string;
    
    if (amount <= tiers.tier1_max) {
      tier = 1;
      recommended = tiers.tier1_method;
    } else if (amount <= tiers.tier2_max) {
      tier = 2;
      recommended = tiers.tier2_method;
    } else {
      tier = 3;
      recommended = tiers.tier3_method;
    }

    // Build available options
    const options = [];

    // Paystack option for tier 1 and 2
    if (tier === 1 || tier === 2) {
      options.push({
        method: 'paystack',
        label: 'Pay Now Online (Paystack)',
        channels: ['card', 'mobile_money', 'bank_transfer', 'ussd'],
        fees: '1.95% + GHS 0.50',
        processingTime: 'Instant',
        benefits: ['Auto-verified', 'Instant confirmation', 'Multiple payment options', 'No receipt upload needed']
      });
    }

    // Manual option (always available)
    options.push({
      method: 'manual',
      label: 'Bank Transfer',
      channels: ['bank_transfer'],
      fees: 'Bank charges apply',
      processingTime: '24-48 hours verification',
      benefits: tier === 3 ? ['Recommended for large orders', 'Lower fees'] : ['Alternative option']
    });

    console.log(`Payment options for order ${orderId}: tier ${tier}, recommended ${recommended}`);

    return new Response(
      JSON.stringify({
        tier,
        recommended,
        amount,
        currency: order.currency,
        options
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in get-payment-options:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
