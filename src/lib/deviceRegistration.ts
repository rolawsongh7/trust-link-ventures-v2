import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

interface DeviceRegistration {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  pushToken: string;
}

/**
 * Generate a unique device ID for web browsers
 */
function generateWebDeviceId(): string {
  // Try to get existing device ID from localStorage
  const existingId = localStorage.getItem('device_id');
  if (existingId) return existingId;

  // Generate a new device ID
  const newId = `web-${crypto.randomUUID()}`;
  localStorage.setItem('device_id', newId);
  return newId;
}

/**
 * Get the current platform
 */
function getPlatform(): 'ios' | 'android' | 'web' {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

/**
 * Get or generate a device ID
 */
export function getDeviceId(): string {
  const platform = getPlatform();

  if (platform === 'web') {
    return generateWebDeviceId();
  }

  // For native platforms, we'll use a UUID stored in preferences
  // In a real app, you might want to use Capacitor's Device plugin
  const storedId = localStorage.getItem('device_id');
  if (storedId) return storedId;

  const newId = `${platform}-${crypto.randomUUID()}`;
  localStorage.setItem('device_id', newId);
  return newId;
}

/**
 * Register a device for push notifications
 */
export async function registerDevice(
  pushToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const deviceId = getDeviceId();
    const platform = getPlatform();

    // Upsert device registration
    const { error } = await supabase
      .from('user_devices')
      .upsert(
        {
          user_id: user.id,
          device_id: deviceId,
          platform,
          push_token: pushToken,
          last_active: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,device_id',
        }
      );

    if (error) {
      console.error('Error registering device:', error);
      return { success: false, error: error.message };
    }

    console.log(`Device registered: ${deviceId} (${platform})`);
    return { success: true };
  } catch (err: any) {
    console.error('Error registering device:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Update the push token for an existing device
 */
export async function updateDeviceToken(
  pushToken: string
): Promise<{ success: boolean; error?: string }> {
  return registerDevice(pushToken); // Upsert handles both insert and update
}

/**
 * Update device last active timestamp
 */
export async function updateDeviceActivity(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const deviceId = getDeviceId();

    await supabase
      .from('user_devices')
      .update({ last_active: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('device_id', deviceId);
  } catch (err) {
    console.error('Error updating device activity:', err);
  }
}

/**
 * Unregister all devices for the current user (on logout)
 */
export async function unregisterAllDevices(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_devices')
      .delete()
      .eq('user_id', user.id);

    console.log('All devices unregistered for user');
  } catch (err) {
    console.error('Error unregistering devices:', err);
  }
}

/**
 * Unregister the current device (e.g., when user disables notifications)
 */
export async function unregisterCurrentDevice(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const deviceId = getDeviceId();

    await supabase
      .from('user_devices')
      .delete()
      .eq('user_id', user.id)
      .eq('device_id', deviceId);

    console.log('Current device unregistered');
  } catch (err) {
    console.error('Error unregistering current device:', err);
  }
}

/**
 * Get all registered devices for the current user
 */
export async function getUserDevices(): Promise<DeviceRegistration[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_devices')
      .select('device_id, platform, push_token')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching user devices:', error);
      return [];
    }

    return (data || []).map(d => ({
      deviceId: d.device_id,
      platform: d.platform as 'ios' | 'android' | 'web',
      pushToken: d.push_token,
    }));
  } catch (err) {
    console.error('Error fetching user devices:', err);
    return [];
  }
}
