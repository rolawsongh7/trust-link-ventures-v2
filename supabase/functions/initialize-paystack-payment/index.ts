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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');

    if (!paystackSecretKey) {
      throw new Error('PAYSTACK_SECRET_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { orderId, customerEmail, customerPhone, amount, currency, callbackUrl } = await req.json();

    if (!orderId || !customerEmail || !amount || !callbackUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: orderId, customerEmail, amount, callbackUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Initializing Paystack payment for order:', orderId);

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Check if payment already initialized
    if (order.payment_reference) {
      console.log('Payment already initialized for order:', orderId);
      return new Response(
        JSON.stringify({ error: 'Payment already initialized for this order' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique reference
    const reference = `ORD-${order.order_number}-${Date.now()}`;

    // Prepare Paystack payload
    const paystackPayload = {
      email: customerEmail,
      amount: Math.round(amount * 100), // Convert to kobo
      currency: currency || 'GHS',
      reference,
      callback_url: callbackUrl,
      metadata: {
        order_id: orderId,
        order_number: order.order_number,
        customer_phone: customerPhone,
        custom_fields: [
          {
            display_name: "Order Number",
            variable_name: "order_number",
            value: order.order_number
          }
        ]
      },
      channels: ['card', 'mobile_money', 'bank', 'ussd']
    };

    console.log('Calling Paystack API to initialize payment');

    // Initialize payment with Paystack
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paystackPayload)
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      console.error('Paystack API error:', paystackData);
      throw new Error(paystackData.message || 'Failed to initialize payment with Paystack');
    }

    console.log('Paystack payment initialized successfully');

    // Store transaction in database
    const { error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        order_id: orderId,
        payment_reference: reference,
        amount,
        currency: currency || 'GHS',
        status: 'pending',
        customer_email: customerEmail,
        customer_phone: customerPhone,
        gateway_response: paystackData.data
      });

    if (transactionError) {
      console.error('Failed to store transaction:', transactionError);
      throw transactionError;
    }

    // Update order with payment details
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_gateway: 'paystack',
        payment_reference: reference,
        payment_status: 'pending',
        payment_initiated_at: new Date().toISOString(),
        payment_metadata: paystackData.data
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        reference,
        authorizationUrl: paystackData.data.authorization_url,
        accessCode: paystackData.data.access_code
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error initializing Paystack payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
