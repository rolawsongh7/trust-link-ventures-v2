import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('PAYSTACK_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      throw new Error('PAYSTACK_WEBHOOK_SECRET not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get signature and raw body
    const signature = req.headers.get('x-paystack-signature');
    const rawBody = await req.text();

    // Verify webhook signature
    const hash = createHmac('sha512', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      console.error('Invalid webhook signature');
      return new Response('Invalid signature', { status: 401, headers: corsHeaders });
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    console.log('Paystack webhook event received:', event);

    switch (event) {
      case 'charge.success': {
        const reference = data.reference;
        
        console.log('Processing successful payment for reference:', reference);

        // Update transaction
        const { error: transactionError } = await supabase
          .from('payment_transactions')
          .update({
            status: 'success',
            payment_transaction_id: data.id?.toString(),
            payment_channel: data.channel,
            completed_at: new Date().toISOString(),
            gateway_response: data
          })
          .eq('payment_reference', reference);

        if (transactionError) {
          console.error('Failed to update transaction:', transactionError);
        }

        // Update order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .update({
            status: 'payment_received',
            payment_status: 'success',
            payment_transaction_id: data.id?.toString(),
            payment_amount_paid: data.amount / 100,
            payment_channel: data.channel,
            payment_verified_at: new Date().toISOString(),
            payment_confirmed_at: new Date().toISOString()
          })
          .eq('payment_reference', reference)
          .select('*, customers(*)');

        if (orderError) {
          console.error('Failed to update order:', orderError);
        }

        // Send notification emails
        if (order && order.length > 0) {
          const orderData = order[0];
          
          try {
            // Send to customer
            await supabase.functions.invoke('send-email', {
              body: {
                to: data.customer.email,
                subject: `Payment Confirmed - Order ${orderData.order_number}`,
                html: `
                  <h2>Payment Confirmed</h2>
                  <p>Dear ${orderData.customers?.contact_name || orderData.customers?.company_name},</p>
                  <p>Your payment of ${data.currency} ${(data.amount / 100).toFixed(2)} has been successfully received via Paystack.</p>
                  <p><strong>Order Number:</strong> ${orderData.order_number}</p>
                  <p><strong>Payment Reference:</strong> ${reference}</p>
                  <p><strong>Payment Method:</strong> ${data.channel}</p>
                  <p>Your order is now being processed.</p>
                `
              }
            });

            // Notify admin
            await supabase.functions.invoke('send-email', {
              body: {
                to: 'admin@trustlinkventures.com',
                subject: `New Payment Received - ${orderData.order_number}`,
                html: `
                  <h2>Payment Received</h2>
                  <p>Order ${orderData.order_number} has received payment via Paystack.</p>
                  <p><strong>Amount:</strong> ${data.currency} ${(data.amount / 100).toFixed(2)}</p>
                  <p><strong>Reference:</strong> ${reference}</p>
                  <p><strong>Channel:</strong> ${data.channel}</p>
                `
              }
            });
          } catch (emailError) {
            console.error('Failed to send notification emails:', emailError);
          }
        }

        break;
      }

      case 'charge.failed': {
        const reference = data.reference;
        
        console.log('Processing failed payment for reference:', reference);

        await supabase
          .from('payment_transactions')
          .update({
            status: 'failed',
            gateway_response: data
          })
          .eq('payment_reference', reference);

        await supabase
          .from('orders')
          .update({
            payment_status: 'failed'
          })
          .eq('payment_reference', reference);

        break;
      }

      default:
        console.log('Unhandled webhook event:', event);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing Paystack webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
