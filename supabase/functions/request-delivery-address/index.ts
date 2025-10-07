import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, orderNumber, customerEmail, customerName, companyName } = await req.json();

    if (!orderId || !customerEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Requesting delivery address for order:', orderNumber);

    // Get customer ID to create notification
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', customerEmail)
      .single();

    // Send email to customer
    const emailResult = await resend.emails.send({
      from: 'Trust Link Ventures <orders@trustlinkventures.com>',
      to: [customerEmail],
      subject: `Delivery Address Required for Order ${orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Delivery Address Required</h2>
          <p>Dear ${customerName || companyName},</p>
          <p>Thank you for your order <strong>${orderNumber}</strong>. We're ready to process your shipment!</p>
          <p>To proceed with shipping, we need your delivery address. Please log in to your customer portal to provide this information:</p>
          
          <div style="margin: 30px 0;">
            <a href="${supabaseUrl.replace('https://', 'https://app.')}/customer/orders" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Provide Delivery Address
            </a>
          </div>
          
          <p>Once we receive your delivery address, we'll prepare your order for shipment immediately.</p>
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>Trust Link Ventures Team</p>
        </div>
      `,
    });

    console.log('Email sent:', emailResult);

    // Create in-app notification if customer exists
    if (customer) {
      // Get customer's user_id (assuming customers table has user_id or we need to look it up)
      const { data: authUser } = await supabase.auth.admin.listUsers();
      const matchingUser = authUser.users?.find(u => u.email === customerEmail);

      if (matchingUser) {
        await supabase.from('user_notifications').insert({
          user_id: matchingUser.id,
          type: 'order_update',
          title: 'Delivery Address Required',
          message: `Please provide delivery address for order ${orderNumber}`,
          link: '/customer/orders',
          metadata: { orderId, orderNumber },
        });
      }
    }

    // Log activity in communications
    await supabase.from('communications').insert({
      order_id: orderId,
      communication_type: 'email',
      subject: 'Delivery Address Request',
      content: `Delivery address requested from customer via email to ${customerEmail}`,
      direction: 'outbound',
      contact_person: customerName || companyName,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Delivery address request sent successfully',
        emailId: emailResult.data?.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error requesting delivery address:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});