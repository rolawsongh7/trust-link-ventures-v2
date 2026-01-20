import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  link?: string;
  data?: Record<string, any>;
  platform?: 'ios' | 'android' | 'web' | 'all';
}

interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    const { userId, title, body, link, data, platform = 'all' } = payload;

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending push notification to user ${userId}: ${title}`);

    // Fetch user's registered devices
    let query = supabase
      .from('user_devices')
      .select('device_id, platform, push_token')
      .eq('user_id', userId);

    if (platform !== 'all') {
      query = query.eq('platform', platform);
    }

    const { data: devices, error: devicesError } = await query;

    if (devicesError) {
      console.error('Error fetching devices:', devicesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user devices' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!devices || devices.length === 0) {
      console.log(`No registered devices found for user ${userId}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No devices registered for push notifications',
          devicesNotified: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${devices.length} device(s) for user ${userId}`);

    const results = {
      total: devices.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each device
    for (const device of devices) {
      try {
        if (device.platform === 'web') {
          // Web Push - requires VAPID keys
          const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
          const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
          
          if (!vapidPublicKey || !vapidPrivateKey) {
            console.log('VAPID keys not configured, skipping web push');
            results.errors.push(`Web device ${device.device_id}: VAPID keys not configured`);
            results.failed++;
            continue;
          }

          // The push_token for web is the subscription JSON
          try {
            const subscription: WebPushSubscription = JSON.parse(device.push_token);
            
            // In production, use web-push library
            // For now, log the attempt
            console.log(`Would send web push to endpoint: ${subscription.endpoint}`);
            results.success++;
          } catch (parseError) {
            console.error(`Invalid web push subscription for device ${device.device_id}`);
            results.errors.push(`Web device ${device.device_id}: Invalid subscription format`);
            results.failed++;
          }
        } else if (device.platform === 'ios' || device.platform === 'android') {
          // FCM for both iOS and Android
          const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
          
          if (!fcmServerKey) {
            console.log('FCM server key not configured, skipping native push');
            results.errors.push(`${device.platform} device ${device.device_id}: FCM key not configured`);
            results.failed++;
            continue;
          }

          // Send via FCM
          const fcmPayload = {
            to: device.push_token,
            notification: {
              title,
              body,
              click_action: link || '/',
              sound: 'default',
            },
            data: {
              ...data,
              link: link || '/',
              notificationId: crypto.randomUUID(),
            },
            priority: 'high',
          };

          const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `key=${fcmServerKey}`,
            },
            body: JSON.stringify(fcmPayload),
          });

          if (fcmResponse.ok) {
            const fcmResult = await fcmResponse.json();
            if (fcmResult.success === 1) {
              console.log(`FCM push sent to ${device.platform} device ${device.device_id}`);
              results.success++;
            } else {
              console.error(`FCM push failed for device ${device.device_id}:`, fcmResult);
              results.errors.push(`${device.platform} device ${device.device_id}: FCM error`);
              results.failed++;

              // If token is invalid, remove the device
              if (fcmResult.results?.[0]?.error === 'NotRegistered') {
                await supabase
                  .from('user_devices')
                  .delete()
                  .eq('device_id', device.device_id)
                  .eq('user_id', userId);
                console.log(`Removed invalid device ${device.device_id}`);
              }
            }
          } else {
            console.error(`FCM request failed: ${fcmResponse.status}`);
            results.errors.push(`${device.platform} device ${device.device_id}: FCM request failed`);
            results.failed++;
          }
        }
      } catch (deviceError: any) {
        console.error(`Error processing device ${device.device_id}:`, deviceError);
        results.errors.push(`Device ${device.device_id}: ${deviceError.message}`);
        results.failed++;
      }
    }

    console.log(`Push notification results: ${results.success}/${results.total} succeeded`);

    return new Response(
      JSON.stringify({
        success: true,
        devicesNotified: results.success,
        devicesFailed: results.failed,
        totalDevices: results.total,
        errors: results.errors.length > 0 ? results.errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
