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

  const requestId = `addr-confirm-${Date.now()}`;
  
  try {
    const { orderId, orderNumber, addressId, customerEmail } = await req.json();

    if (!orderId || !orderNumber || !addressId || !customerEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    console.log(`📧 [${requestId}] Sending address confirmation for order: ${orderNumber}`);

    // Fetch address details
    const { data: address, error: addressError } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('id', addressId)
      .single();

    if (addressError || !address) {
      console.error(`❌ [${requestId}] Address not found:`, addressError);
      return new Response(
        JSON.stringify({ error: 'Address not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order details
    const { data: order } = await supabase
      .from('orders')
      .select('*, customers(company_name, contact_name)')
      .eq('id', orderId)
      .single();

    const customerName = order?.customers?.contact_name || order?.customers?.company_name || 'Customer';
    const companyName = order?.customers?.company_name || '';

    // Send email to admin
    try {
      await resend.emails.send({
        from: 'Trust Link Ventures <info@trustlinkventureslimited.com>',
        to: ['trustlventuresghana_a01@yahoo.com'],
        subject: `✅ Delivery Address Confirmed - Order ${orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h2 style="color: white; margin: 0;">✅ Delivery Address Confirmed</h2>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #374151;">
                The customer has confirmed their delivery address for <strong style="color: #10b981;">Order ${orderNumber}</strong>.
              </p>
              
              <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #065f46;">Order Details</h3>
                <p style="margin: 5px 0; color: #065f46;"><strong>Order Number:</strong> ${orderNumber}</p>
                <p style="margin: 5px 0; color: #065f46;"><strong>Customer:</strong> ${customerName}${companyName ? ` (${companyName})` : ''}</p>
                <p style="margin: 5px 0; color: #065f46;"><strong>Email:</strong> ${customerEmail}</p>
              </div>
              
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #374151;">Delivery Address</h3>
                <p style="margin: 5px 0; color: #374151;"><strong>Receiver:</strong> ${address.receiver_name}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Phone:</strong> ${address.phone_number}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Ghana Digital Address:</strong> ${address.ghana_digital_address}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Street:</strong> ${address.street_address}</p>
                ${address.area ? `<p style="margin: 5px 0; color: #374151;"><strong>Area:</strong> ${address.area}</p>` : ''}
                <p style="margin: 5px 0; color: #374151;"><strong>City:</strong> ${address.city}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Region:</strong> ${address.region}</p>
                ${address.additional_directions ? `<p style="margin: 5px 0; color: #374151;"><strong>Directions:</strong> ${address.additional_directions}</p>` : ''}
              </div>
              
              <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af;">
                  <strong>📦 Next Step:</strong> This order is now ready for processing and shipment preparation.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${supabaseUrl.replace('https://', 'https://app.')}/admin/orders" 
                   style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                          color: white; 
                          padding: 15px 40px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          display: inline-block;
                          font-weight: bold;
                          font-size: 16px;">
                  📊 View in Admin Dashboard
                </a>
              </div>
            </div>
          </div>
        `,
      });
      console.log(`✅ [${requestId}] Admin email sent successfully`);
    } catch (emailError) {
      console.error(`❌ [${requestId}] Failed to send admin email:`, emailError);
    }

    // Send confirmation email to customer
    try {
      await resend.emails.send({
        from: 'Trust Link Ventures <info@trustlinkventureslimited.com>',
        to: [customerEmail],
        subject: `Delivery Address Confirmed - Order ${orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h2 style="color: white; margin: 0;">✅ Delivery Address Confirmed!</h2>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #374151;">Dear ${customerName},</p>
              
              <p style="font-size: 16px; color: #374151;">
                Thank you! We've received your delivery address for <strong style="color: #667eea;">Order ${orderNumber}</strong>.
              </p>
              
              <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #065f46;">
                  <strong>✅ Confirmed:</strong> Your delivery address has been saved and linked to your order.
                </p>
              </div>
              
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #374151;">Your Delivery Address</h3>
                <p style="margin: 5px 0; color: #374151;"><strong>Receiver:</strong> ${address.receiver_name}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Phone:</strong> ${address.phone_number}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Ghana Digital Address:</strong> ${address.ghana_digital_address}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Address:</strong> ${address.street_address}${address.area ? `, ${address.area}` : ''}, ${address.city}, ${address.region}</p>
              </div>
              
              <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af;">
                  <strong>📦 What's Next:</strong> We'll start processing your order and preparing it for shipment. You'll receive another email with tracking information once your order ships.
                </p>
              </div>
              
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
                  📦 Track Your Order
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                If you have any questions or need to update your delivery address, please contact us at 
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
      console.log(`✅ [${requestId}] Customer email sent successfully`);
    } catch (emailError) {
      console.error(`❌ [${requestId}] Failed to send customer email:`, emailError);
    }

    // Log communication
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customerEmail)
        .maybeSingle();

      await supabase.from('communications').insert({
        order_id: orderId,
        customer_id: customer?.id,
        communication_type: 'email',
        subject: 'Delivery Address Confirmation',
        content: `Delivery address confirmed for order ${orderNumber}. Address: ${address.street_address}, ${address.city}, ${address.region}`,
        direction: 'outbound',
        contact_person: customerName,
      });
      console.log(`📝 [${requestId}] Communication logged`);
    } catch (commError) {
      console.warn(`⚠️ [${requestId}] Failed to log communication:`, commError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Address confirmation emails sent successfully',
        requestId,
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
        requestId,
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
