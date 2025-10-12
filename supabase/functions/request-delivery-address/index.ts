import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = `addr-req-${Date.now()}`;
  
  try {
    const { orderId, orderNumber, customerEmail, customerName, companyName } = await req.json();

    // Validation with specific error messages
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required', code: 'MISSING_ORDER_ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!orderNumber) {
      return new Response(
        JSON.stringify({ error: 'Order number is required', code: 'MISSING_ORDER_NUMBER' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customerEmail || !customerEmail.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Valid customer email is required', code: 'INVALID_EMAIL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error', code: 'CONFIG_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    console.log(`📧 [${requestId}] Requesting address for order: ${orderNumber} to ${customerEmail}`);

    // Verify order exists and hasn't already been addressed
    const { data: orderCheck, error: orderError } = await supabase
      .from('orders')
      .select('id, delivery_address_id, delivery_address_requested_at, status')
      .eq('id', orderId)
      .single();

    if (orderError || !orderCheck) {
      console.error(`❌ [${requestId}] Order not found:`, orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found', code: 'ORDER_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (orderCheck.delivery_address_id) {
      console.log(`⚠️ [${requestId}] Order already has delivery address`);
      return new Response(
        JSON.stringify({ 
          warning: 'Order already has a delivery address',
          code: 'ADDRESS_EXISTS',
          delivery_address_id: orderCheck.delivery_address_id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get customer info
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', customerEmail)
      .maybeSingle();

    if (customerError) {
      console.error(`❌ [${requestId}] Error fetching customer:`, customerError);
    }

    // Send email with retry logic
    let emailResult;
    let emailAttempts = 0;
    const maxEmailAttempts = 3;

    while (emailAttempts < maxEmailAttempts) {
      try {
        emailAttempts++;
        console.log(`📤 [${requestId}] Email attempt ${emailAttempts}/${maxEmailAttempts}`);

        emailResult = await resend.emails.send({
          from: 'Trust Link Ventures <info@trustlinkventureslimited.com>',
          to: [customerEmail],
          subject: `Delivery Address Required for Order ${orderNumber}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h2 style="color: white; margin: 0;">🏠 Delivery Address Required</h2>
              </div>
              
              <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; color: #374151;">Dear ${customerName || companyName},</p>
                
                <p style="font-size: 16px; color: #374151;">
                  Thank you for your order <strong style="color: #667eea;">${orderNumber}</strong>. 
                  We're ready to process your shipment! 🚚
                </p>
                
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #92400e;">
                    <strong>⚠️ Action Required:</strong> We need your delivery address to proceed with shipping.
                  </p>
                </div>
                
                <p style="font-size: 16px; color: #374151;">
                  Please log in to your customer portal to provide this information:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${supabaseUrl.replace('https://', 'https://app.')}/customer/orders" 
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            color: white; 
                            padding: 15px 40px; 
                            text-decoration: none; 
                            border-radius: 8px; 
                            display: inline-block;
                            font-weight: bold;
                            font-size: 16px;">
                    📍 Provide Delivery Address
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                  Once we receive your delivery address, we'll prepare your order for shipment immediately.
                </p>
                
                <p style="font-size: 14px; color: #6b7280;">
                  If you have any questions, please don't hesitate to contact us at 
                  <a href="mailto:orders@trustlinkventures.com" style="color: #667eea;">orders@trustlinkventures.com</a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="font-size: 14px; color: #374151; margin: 0;">
                  Best regards,<br>
                  <strong>Trust Link Ventures Team</strong>
                </p>
              </div>
            </div>
          `,
        });

        console.log(`✅ [${requestId}] Email sent successfully:`, emailResult.data?.id);
        break;

      } catch (emailError: any) {
        console.error(`❌ [${requestId}] Email attempt ${emailAttempts} failed:`, emailError);
        
        if (emailAttempts >= maxEmailAttempts) {
          return new Response(
            JSON.stringify({ 
              error: 'Failed to send email after multiple attempts',
              code: 'EMAIL_SEND_FAILED',
              details: emailError.message 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, emailAttempts) * 1000));
      }
    }

    // Create in-app notification (best effort)
    if (customer) {
      try {
        const { data: authUser } = await supabase.auth.admin.listUsers();
        const matchingUser = authUser.users?.find(u => u.email === customerEmail);

        if (matchingUser) {
          await supabase.from('user_notifications').insert({
            user_id: matchingUser.id,
            type: 'order_update',
            title: '🏠 Delivery Address Required',
            message: `Please provide delivery address for order ${orderNumber}`,
            link: '/customer/orders',
            metadata: { orderId, orderNumber, requestId },
          });
          console.log(`🔔 [${requestId}] In-app notification created`);
        }
      } catch (notifError) {
        console.warn(`⚠️ [${requestId}] Failed to create notification (non-critical):`, notifError);
      }
    }

    // Log communication (best effort)
    try {
      await supabase.from('communications').insert({
        order_id: orderId,
        customer_id: customer?.id,
        communication_type: 'email',
        subject: 'Delivery Address Request',
        content: `Delivery address requested from customer via email to ${customerEmail}`,
        direction: 'outbound',
        contact_person: customerName || companyName,
      });
      console.log(`📝 [${requestId}] Communication logged`);
    } catch (commError) {
      console.warn(`⚠️ [${requestId}] Failed to log communication (non-critical):`, commError);
    }

    // Update order timestamp
    try {
      await supabase
        .from('orders')
        .update({ delivery_address_requested_at: new Date().toISOString() })
        .eq('id', orderId);
      console.log(`⏰ [${requestId}] Order timestamp updated`);
    } catch (updateError) {
      console.warn(`⚠️ [${requestId}] Failed to update timestamp:`, updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Delivery address request sent successfully',
        requestId,
        emailId: emailResult?.data?.id,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error(`❌ [${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        requestId,
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});