import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ghipss-signature',
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

    // Get webhook secret
    const webhookSecret = Deno.env.get('GHIPSS_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error('GHIPSS webhook secret not configured');
      return new Response('Webhook not configured', { status: 503 });
    }

    // Verify webhook signature
    const signature = req.headers.get('x-ghipss-signature');
    const rawBody = await req.text();
    
    if (signature) {
      const hmac = createHmac('sha256', webhookSecret);
      hmac.update(rawBody);
      const expectedSignature = hmac.digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return new Response('Invalid signature', { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    console.log(`Received GhIPSS webhook event: ${event}`);

    const reference = data.reference;
    
    if (!reference) {
      console.error('No reference in webhook payload');
      return new Response('Invalid payload', { status: 400 });
    }

    // Fetch transaction and order
    const { data: transaction, error: txnError } = await supabase
      .from('payment_transactions')
      .select('*, orders(id, order_number, customer_id, customers(company_name, email))')
      .eq('ghipss_reference', reference)
      .single();

    if (txnError || !transaction) {
      console.error('Transaction not found:', reference);
      return new Response('Transaction not found', { status: 404 });
    }

    // Update transaction with webhook data
    await supabase
      .from('payment_transactions')
      .update({
        webhook_received_at: new Date().toISOString(),
        ghipss_response: data
      })
      .eq('id', transaction.id);

    // Handle different webhook events
    switch (event) {
      case 'payment.success':
        console.log(`Processing successful payment: ${reference}`);
        
        // Update transaction
        await supabase
          .from('payment_transactions')
          .update({
            status: 'success',
            ghipss_transaction_id: data.transaction_id,
            payment_channel: data.channel,
            completed_at: new Date().toISOString()
          })
          .eq('id', transaction.id);

        // Update order status
        await supabase
          .from('orders')
          .update({
            status: 'payment_received',
            ghipss_status: 'success',
            ghipss_transaction_id: data.transaction_id,
            payment_amount_paid: transaction.amount,
            payment_channel: data.channel,
            payment_verified_at: new Date().toISOString(),
            payment_confirmed_at: new Date().toISOString()
          })
          .eq('id', transaction.order_id);

        // Log audit event
        await supabase
          .from('audit_logs')
          .insert({
            event_type: 'payment_verified',
            action: 'auto_verify_payment',
            resource_type: 'order',
            resource_id: transaction.order_id,
            event_data: {
              reference,
              transaction_id: data.transaction_id,
              amount: transaction.amount,
              channel: data.channel
            },
            severity: 'low'
          });

        // Send customer confirmation email
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: transaction.orders.customers.email,
              subject: `✅ Payment Confirmed - Order #${transaction.orders.order_number}`,
              html: `
                <h2>Payment Confirmed</h2>
                <p>Hi ${transaction.orders.customers.company_name},</p>
                <p>Great news! We've received your payment for Order #${transaction.orders.order_number}.</p>
                
                <h3>Payment Details</h3>
                <ul>
                  <li><strong>Order Number:</strong> ${transaction.orders.order_number}</li>
                  <li><strong>Amount Paid:</strong> ${transaction.currency} ${transaction.amount.toLocaleString()}</li>
                  <li><strong>Payment Method:</strong> GhIPSS ${data.channel?.replace('_', ' ')}</li>
                  <li><strong>Transaction Reference:</strong> ${reference}</li>
                  <li><strong>Payment Date:</strong> ${new Date().toLocaleString()}</li>
                </ul>
                
                <p>✓ Your payment has been automatically verified<br>
                ✓ Your order is now being processed<br>
                ✓ You'll receive shipping updates via email</p>
                
                <p>Thank you for your business!</p>
              `
            }
          });
        } catch (emailError) {
          console.error('Error sending customer email:', emailError);
        }

        // Send admin notification
        try {
          // Fetch admin emails
          const { data: adminUsers } = await supabase
            .from('user_roles')
            .select('users:user_id(email)')
            .eq('role', 'admin');

          const adminEmails = adminUsers?.map((u: any) => u.users?.email).filter(Boolean);

          if (adminEmails && adminEmails.length > 0) {
            await supabase.functions.invoke('send-email', {
              body: {
                to: adminEmails,
                subject: `💰 New GhIPSS Payment - Order #${transaction.orders.order_number}`,
                html: `
                  <h2>Transaction Summary</h2>
                  <hr>
                  <p><strong>Order:</strong> #${transaction.orders.order_number}</p>
                  <p><strong>Customer:</strong> ${transaction.orders.customers.company_name}</p>
                  <p><strong>Amount:</strong> ${transaction.currency} ${transaction.amount.toLocaleString()}</p>
                  <p><strong>Payment Method:</strong> GhIPSS ${data.channel?.replace('_', ' ')}</p>
                  <p><strong>Transaction ID:</strong> ${data.transaction_id}</p>
                  <p><strong>Reference:</strong> ${reference}</p>
                  <p><strong>Payment Time:</strong> ${new Date().toLocaleString()}</p>
                  <hr>
                  <p><strong>STATUS:</strong> ✅ Auto-Verified & Confirmed</p>
                  <p><strong>Order Status:</strong> Automatically updated to "Payment Received"</p>
                  <p><strong>Next Action:</strong> Process order for fulfillment</p>
                `
              }
            });
          }
        } catch (adminEmailError) {
          console.error('Error sending admin notification:', adminEmailError);
        }

        break;

      case 'payment.failed':
        console.log(`Processing failed payment: ${reference}`);
        
        await supabase
          .from('payment_transactions')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            notes: data.message || 'Payment failed'
          })
          .eq('id', transaction.id);

        await supabase
          .from('orders')
          .update({
            ghipss_status: 'failed'
          })
          .eq('id', transaction.order_id);

        // Notify customer
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: transaction.orders.customers.email,
              subject: `Payment Failed - Order #${transaction.orders.order_number}`,
              html: `
                <h2>Payment Failed</h2>
                <p>Hi ${transaction.orders.customers.company_name},</p>
                <p>Unfortunately, your payment for Order #${transaction.orders.order_number} was not successful.</p>
                <p><strong>Reason:</strong> ${data.message || 'Payment declined'}</p>
                <p>You can try again or contact us for assistance.</p>
              `
            }
          });
        } catch (emailError) {
          console.error('Error sending failure notification:', emailError);
        }

        break;

      case 'payment.pending':
        console.log(`Payment pending: ${reference}`);
        
        await supabase
          .from('payment_transactions')
          .update({
            status: 'pending',
            notes: data.message || 'Payment pending'
          })
          .eq('id', transaction.id);

        break;

      case 'payment.cancelled':
        console.log(`Payment cancelled: ${reference}`);
        
        await supabase
          .from('payment_transactions')
          .update({
            status: 'cancelled',
            notes: 'Payment cancelled by user'
          })
          .eq('id', transaction.id);

        break;

      default:
        console.log(`Unknown webhook event: ${event}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in ghipss-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
