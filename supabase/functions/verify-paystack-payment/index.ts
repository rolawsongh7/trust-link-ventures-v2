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
    const { reference } = await req.json();

    if (!reference) {
      return new Response(
        JSON.stringify({ error: 'Payment reference is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying Paystack payment for reference:', reference);

    // Fetch transaction from database
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        orders (
          id,
          order_number,
          customer_id,
          customers (
            id,
            email,
            company_name,
            contact_name
          )
        )
      `)
      .eq('payment_reference', reference)
      .single();

    if (transactionError || !transaction) {
      console.error('Transaction not found:', transactionError);
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already successful, return cached result
    if (transaction.status === 'success') {
      console.log('Payment already verified successfully');
      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Payment already verified',
          orderNumber: transaction.orders.order_number
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify with Paystack API
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const verificationData = await paystackResponse.json();

    if (!paystackResponse.ok || !verificationData.status) {
      console.error('Paystack verification error:', verificationData);
      throw new Error(verificationData.message || 'Failed to verify payment');
    }

    const paymentData = verificationData.data;
    const paymentStatus = paymentData.status; // 'success', 'failed', 'abandoned', 'pending'

    console.log('Paystack verification result:', paymentStatus);

    // Update transaction record
    const { error: updateTransactionError } = await supabase
      .from('payment_transactions')
      .update({
        status: paymentStatus,
        payment_transaction_id: paymentData.id?.toString(),
        payment_channel: paymentData.channel,
        completed_at: paymentStatus === 'success' ? new Date().toISOString() : null,
        gateway_response: paymentData
      })
      .eq('payment_reference', reference);

    if (updateTransactionError) {
      console.error('Failed to update transaction:', updateTransactionError);
    }

    // Update order if payment successful
    if (paymentStatus === 'success') {
      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({
          status: 'payment_received',
          payment_status: 'success',
          payment_transaction_id: paymentData.id?.toString(),
          payment_amount_paid: paymentData.amount / 100, // Convert from kobo
          payment_channel: paymentData.channel,
          payment_verified_at: new Date().toISOString(),
          payment_confirmed_at: new Date().toISOString()
        })
        .eq('id', transaction.order_id);

      if (updateOrderError) {
        console.error('Failed to update order:', updateOrderError);
      }

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: transaction.orders.customers.email,
            subject: `Payment Confirmed - Order ${transaction.orders.order_number}`,
            html: `
              <h2>Payment Confirmed</h2>
              <p>Dear ${transaction.orders.customers.contact_name || transaction.orders.customers.company_name},</p>
              <p>Your payment of ${paymentData.currency} ${(paymentData.amount / 100).toFixed(2)} has been successfully received via Paystack.</p>
              <p><strong>Order Number:</strong> ${transaction.orders.order_number}</p>
              <p><strong>Payment Reference:</strong> ${reference}</p>
              <p><strong>Payment Method:</strong> ${paymentData.channel}</p>
              <p>Your order is now being processed.</p>
            `
          }
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }
    }

    return new Response(
      JSON.stringify({
        status: paymentStatus,
        message: paymentStatus === 'success' 
          ? 'Payment verified successfully' 
          : paymentStatus === 'pending'
          ? 'Payment is being processed'
          : 'Payment verification failed',
        orderNumber: transaction.orders.order_number,
        amount: paymentData.amount / 100,
        currency: paymentData.currency,
        channel: paymentData.channel
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying Paystack payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
