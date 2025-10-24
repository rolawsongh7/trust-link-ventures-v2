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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orderId, customerEmail, customerPhone, amount, currency, callbackUrl } = await req.json();

    if (!orderId || !customerEmail || !amount || !callbackUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, status, ghipss_reference')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already initialized
    if (order.ghipss_reference) {
      const { data: existingTransaction } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('ghipss_reference', order.ghipss_reference)
        .single();

      if (existingTransaction && existingTransaction.status === 'pending') {
        console.log(`Payment already initialized for order ${order.order_number}`);
        // Return existing authorization URL (would need to be stored in metadata)
        return new Response(
          JSON.stringify({
            success: true,
            reference: order.ghipss_reference,
            message: 'Payment already initialized'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate unique reference
    const timestamp = Date.now();
    const reference = `GHIPSS-${order.order_number}-${timestamp}`;

    // Get GhIPSS credentials from environment
    const ghipssApiKey = Deno.env.get('GHIPSS_API_KEY');
    const ghipssMerchantId = Deno.env.get('GHIPSS_MERCHANT_ID');
    const ghipssEnvironment = Deno.env.get('GHIPSS_ENVIRONMENT') || 'test';

    if (!ghipssApiKey || !ghipssMerchantId) {
      console.error('GhIPSS credentials not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Payment gateway not configured. Please use manual payment option.',
          fallbackToManual: true
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize GhIPSS payment
    const ghipssApiUrl = ghipssEnvironment === 'production' 
      ? 'https://api.ghipss.com/v1/payments/initialize'
      : 'https://sandbox.ghipss.com/v1/payments/initialize';

    const ghipssPayload = {
      merchant_id: ghipssMerchantId,
      reference,
      amount: amount * 100, // Convert to pesewas
      currency: currency || 'GHS',
      customer_email: customerEmail,
      customer_phone: customerPhone,
      callback_url: callbackUrl,
      metadata: {
        order_id: orderId,
        order_number: order.order_number
      }
    };

    console.log(`Initializing GhIPSS payment for order ${order.order_number}`);

    const ghipssResponse = await fetch(ghipssApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghipssApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ghipssPayload)
    });

    if (!ghipssResponse.ok) {
      const errorData = await ghipssResponse.json();
      console.error('GhIPSS API error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to initialize payment',
          fallbackToManual: true
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ghipssData = await ghipssResponse.json();

    // Store transaction record
    const { error: txnError } = await supabase
      .from('payment_transactions')
      .insert({
        order_id: orderId,
        ghipss_reference: reference,
        amount,
        currency: currency || 'GHS',
        status: 'pending',
        customer_email: customerEmail,
        customer_phone: customerPhone,
        ghipss_response: ghipssData
      });

    if (txnError) {
      console.error('Error storing transaction:', txnError);
    }

    // Update order with GhIPSS reference
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_gateway: 'ghipss',
        ghipss_reference: reference,
        ghipss_status: 'pending',
        payment_initiated_at: new Date().toISOString(),
        ghipss_metadata: ghipssData
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
    }

    console.log(`GhIPSS payment initialized successfully: ${reference}`);

    return new Response(
      JSON.stringify({
        success: true,
        authorizationUrl: ghipssData.authorization_url || ghipssData.payment_url,
        reference,
        expiresAt: ghipssData.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in initialize-ghipss-payment:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        fallbackToManual: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
