import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, orderNumber, paymentMethod, paymentReference } = await req.json();

    console.log('Payment proof upload notification:', { orderId, orderNumber, paymentMethod, paymentReference });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get admin users
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminRoles || adminRoles.length === 0) {
      console.log('No admin users found to notify');
      return new Response(
        JSON.stringify({ message: 'No admins to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Create notifications for all admins
    const notifications = adminRoles.map(admin => ({
      user_id: admin.user_id,
      type: 'payment_proof_uploaded',
      title: 'New Payment Proof Uploaded',
      message: `Customer uploaded payment proof for order ${orderNumber}. Reference: ${paymentReference}`,
      link: `/admin/orders`,
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
      },
    }));

    const { error: notificationError } = await supabase
      .from('user_notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('Error creating notifications:', notificationError);
      throw notificationError;
    }

    console.log(`Created ${notifications.length} admin notifications`);

    return new Response(
      JSON.stringify({ message: 'Notifications sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in notify-payment-proof-uploaded:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
