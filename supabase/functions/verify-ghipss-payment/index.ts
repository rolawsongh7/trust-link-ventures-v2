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

    const { reference } = await req.json();

    if (!reference) {
      return new Response(
        JSON.stringify({ error: 'Payment reference is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch transaction record
    const { data: transaction, error: txnError } = await supabase
      .from('payment_transactions')
      .select('*, orders(id, order_number, customer_id, customers(company_name, email))')
      .eq('ghipss_reference', reference)
      .single();

    if (txnError || !transaction) {
      console.error('Transaction not found:', txnError);
      return new Response(
        JSON.stringify({ error: 'Payment transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already successful, return cached result
    if (transaction.status === 'success') {
      return new Response(
        JSON.stringify({
          status: 'success',
          orderNumber: transaction.orders.order_number,
          message: 'Payment already verified'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify with GhIPSS API
    const ghipssApiKey = Deno.env.get('GHIPSS_API_KEY');
    const ghipssEnvironment = Deno.env.get('GHIPSS_ENVIRONMENT') || 'test';

    if (!ghipssApiKey) {
      console.error('GhIPSS API key not configured');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ghipssApiUrl = ghipssEnvironment === 'production'
      ? `https://api.ghipss.com/v1/payments/verify/${reference}`
      : `https://sandbox.ghipss.com/v1/payments/verify/${reference}`;

    console.log(`Verifying payment with GhIPSS: ${reference}`);

    const ghipssResponse = await fetch(ghipssApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghipssApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!ghipssResponse.ok) {
      const errorData = await ghipssResponse.json();
      console.error('GhIPSS verification error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to verify payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verificationData = await ghipssResponse.json();

    // Update transaction record
    await supabase
      .from('payment_transactions')
      .update({
        status: verificationData.status,
        ghipss_transaction_id: verificationData.transaction_id,
        payment_channel: verificationData.channel,
        completed_at: verificationData.status === 'success' ? new Date().toISOString() : null,
        failed_at: verificationData.status === 'failed' ? new Date().toISOString() : null,
        ghipss_response: verificationData,
        verification_attempts: transaction.verification_attempts + 1,
        last_verification_at: new Date().toISOString()
      })
      .eq('id', transaction.id);

    // If payment successful, update order
    if (verificationData.status === 'success') {
      await supabase
        .from('orders')
        .update({
          status: 'payment_received',
          ghipss_status: 'success',
          ghipss_transaction_id: verificationData.transaction_id,
          payment_amount_paid: transaction.amount,
          payment_channel: verificationData.channel,
          payment_verified_at: new Date().toISOString(),
          payment_confirmed_at: new Date().toISOString()
        })
        .eq('id', transaction.order_id);

      console.log(`Payment verified successfully: ${reference}`);

      // Send confirmation email to customer
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: transaction.orders.customers.email,
            subject: `✅ Payment Confirmed - Order #${transaction.orders.order_number}`,
            template: 'payment-confirmation',
            data: {
              orderNumber: transaction.orders.order_number,
              amount: transaction.amount,
              currency: transaction.currency,
              reference,
              paymentChannel: verificationData.channel,
              customerName: transaction.orders.customers.company_name
            }
          }
        });
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
      }

      return new Response(
        JSON.stringify({
          status: 'success',
          orderNumber: transaction.orders.order_number,
          message: 'Payment verified successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return current status
    return new Response(
      JSON.stringify({
        status: verificationData.status,
        message: verificationData.message || 'Payment verification in progress'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in verify-ghipss-payment:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
