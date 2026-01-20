import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminNotificationRequest {
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
  // New action event fields
  requiresAction?: boolean;
  entityType?: string;
  entityId?: string;
  deepLink?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      type, 
      title, 
      message, 
      link, 
      metadata,
      requiresAction,
      entityType,
      entityId,
      deepLink
    }: AdminNotificationRequest = await req.json();

    console.log('Admin notification request:', { type, title, message, link, requiresAction, entityType, entityId });

    if (!type || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, title, message' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all admin users
    const { data: adminRoles, error: adminError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminError) {
      console.error('Error fetching admin roles:', adminError);
      throw adminError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log('No admin users found to notify');
      return new Response(
        JSON.stringify({ message: 'No admins to notify', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Create notifications for all admins with action fields
    const notifications = adminRoles.map(admin => ({
      user_id: admin.user_id,
      type,
      title,
      message,
      link: deepLink || link,
      metadata: metadata || {},
      // New action event fields
      requires_action: requiresAction || false,
      resolved: false,
      entity_type: entityType,
      entity_id: entityId,
      deep_link: deepLink || link,
      role: 'admin',
    }));

    const { error: notificationError } = await supabase
      .from('user_notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('Error creating notifications:', notificationError);
      throw notificationError;
    }

    console.log(`Created ${notifications.length} admin notifications for type: ${type}${requiresAction ? ' (requires action)' : ''}`);

    // Send push notifications to admins if requires_action
    if (requiresAction) {
      for (const admin of adminRoles) {
        try {
          // Call send-push-notification edge function for each admin
          const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              userId: admin.user_id,
              title,
              body: message,
              link: deepLink || link,
              data: { entityType, entityId }
            })
          });
          
          if (!pushResponse.ok) {
            console.warn(`Push notification failed for admin ${admin.user_id}:`, await pushResponse.text());
          }
        } catch (pushError) {
          console.warn(`Push notification error for admin ${admin.user_id}:`, pushError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Admin notifications sent successfully',
        count: notifications.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in notify-admins:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
