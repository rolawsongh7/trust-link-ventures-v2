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
      .select('id, order_number, shipped_at')
      .eq('status', 'shipped')
      .lt('shipped_at', sevenDaysAgo.toISOString());

    if (fetchError) throw fetchError;

    let updatedCount = 0;
    if (orders && orders.length > 0) {
      for (const order of orders) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status: 'delivered', delivered_at: new Date().toISOString() })
          .eq('id', order.id);

        if (!updateError) {
          updatedCount++;

          // Log the automation
          await supabase.from('audit_logs').insert({
            event_type: 'workflow_automation',
            event_data: {
              workflow: 'auto_mark_delivered',
              order_id: order.id,
              order_number: order.order_number,
              old_status: 'shipped',
              new_status: 'delivered',
            },
            severity: 'low',
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${updatedCount} orders`,
        ordersChecked: orders?.length || 0,
        ordersUpdated: updatedCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
