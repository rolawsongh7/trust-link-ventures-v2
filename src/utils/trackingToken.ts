import { supabase } from '@/integrations/supabase/client';

/**
 * Get or create a tracking token for an order.
 * This token allows public access to order tracking without authentication.
 */
export async function getOrCreateTrackingToken(orderId: string): Promise<string | null> {
  try {
    // Check if a valid token already exists
    const { data: existingToken } = await supabase
      .from('delivery_tracking_tokens')
      .select('token, expires_at')
      .eq('order_id', orderId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingToken?.token) {
      console.log('[TrackingToken] Found existing valid token for order:', orderId);
      return existingToken.token;
    }

    // Create a new token
    const { data: newToken, error } = await supabase
      .from('delivery_tracking_tokens')
      .insert({ order_id: orderId })
      .select('token')
      .single();

    if (error) {
      console.error('[TrackingToken] Failed to create token:', error);
      return null;
    }

    console.log('[TrackingToken] Created new token for order:', orderId);
    return newToken.token;
  } catch (err) {
    console.error('[TrackingToken] Error getting/creating token:', err);
    return null;
  }
}

/**
 * Build a public tracking URL using a token.
 * Falls back to authenticated portal URL if token creation fails.
 */
export function buildTrackingUrl(token: string | null, orderId: string): string {
  const baseUrl = 'https://trustlinkcompany.com';
  
  if (token) {
    return `${baseUrl}/track?token=${token}`;
  }
  
  // Fallback to authenticated portal URL
  return `${baseUrl}/portal/orders/${orderId}`;
}
