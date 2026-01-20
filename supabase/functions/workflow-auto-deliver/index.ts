import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for orders shipped more than 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, shipped_at, proof_of_delivery_url, delivery_proof_url')
      .eq('status', 'shipped')
      .lt('shipped_at', sevenDaysAgo.toISOString());

    if (fetchError) throw fetchError;

    let deliveredCount = 0;
    let pendingPodCount = 0;

    if (orders && orders.length > 0) {
      for (const order of orders) {
        // Check if POD exists (either proof_of_delivery_url or delivery_proof_url)
        const hasPod = order.proof_of_delivery_url || order.delivery_proof_url;

        if (hasPod) {
          // POD exists - safe to auto-complete as delivered
          const { error: updateError } = await supabase
            .from('orders')
            .update({ 
              status: 'delivered', 
              delivered_at: new Date().toISOString(),
              delivered_by: 'system_auto_delivery'
            })
            .eq('id', order.id);

          if (!updateError) {
            deliveredCount++;

            // Log the automation
            await supabase.from('audit_logs').insert({
              event_type: 'workflow_automation',
              event_data: {
                workflow: 'auto_mark_delivered',
                order_id: order.id,
                order_number: order.order_number,
                old_status: 'shipped',
                new_status: 'delivered',
                has_pod: true,
                auto_completed: true,
              },
              severity: 'low',
            });
          }
        } else {
          // No POD - flag as delivery_confirmation_pending
          const { error: updateError } = await supabase
            .from('orders')
            .update({ 
              status: 'delivery_confirmation_pending'
            })
            .eq('id', order.id);

          if (!updateError) {
            pendingPodCount++;

            // Log the pending POD alert
            await supabase.from('audit_logs').insert({
              event_type: 'workflow_automation',
              event_data: {
                workflow: 'auto_delivery_blocked',
                order_id: order.id,
                order_number: order.order_number,
                old_status: 'shipped',
                new_status: 'delivery_confirmation_pending',
                has_pod: false,
                reason: 'Proof of delivery required before closure',
              },
              severity: 'medium',
            });

            // Create admin notification for POD requirement
            await supabase.from('notifications').insert({
              title: 'Proof of Delivery Required',
              message: `Order ${order.order_number} requires proof of delivery before it can be marked as delivered.`,
              type: 'order_pod_required',
              data: {
                order_id: order.id,
                order_number: order.order_number,
              },
            });
          }
        }
      }
    }

    console.log(`Auto-delivery processed: ${deliveredCount} delivered, ${pendingPodCount} pending POD`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${deliveredCount + pendingPodCount} orders`,
        ordersChecked: orders?.length || 0,
        ordersDelivered: deliveredCount,
        ordersPendingPod: pendingPodCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Auto-deliver error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
