import { isNativeApp } from '@/utils/env';
import { Capacitor } from '@capacitor/core';

export interface SessionFingerprint {
  deviceId: string;
  platform: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  timestamp: string;
}

/**
 * Generate a device fingerprint for session validation
 */
export const generateSessionFingerprint = async (): Promise<SessionFingerprint> => {
  const deviceId = await getDeviceId();
  
  return {
    deviceId,
    platform: Capacitor.getPlatform(),
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Get persistent device ID
 */
const getDeviceId = async (): Promise<string> => {
  // Try to get from secure storage
  const storedId = localStorage.getItem('device_fingerprint_id');
  
  if (storedId) {
    return storedId;
  }
  
  // Generate new device ID
  const newId = generateUUID();
  localStorage.setItem('device_fingerprint_id', newId);
  
  return newId;
};

/**
 * Generate UUID v4
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Validate session fingerprint
 * Returns true if fingerprint matches, false if suspicious
 */
export const validateSessionFingerprint = async (
  storedFingerprint: SessionFingerprint
): Promise<boolean> => {
  const currentFingerprint = await generateSessionFingerprint();
  
  // Check critical fields that shouldn't change
  const criticalFieldsMatch =
    currentFingerprint.deviceId === storedFingerprint.deviceId &&
    currentFingerprint.platform === storedFingerprint.platform;
  
  // Check non-critical fields (can change but worth flagging)
  const nonCriticalFieldsMatch =
    currentFingerprint.userAgent === storedFingerprint.userAgent &&
    currentFingerprint.timezone === storedFingerprint.timezone;
  
  if (!criticalFieldsMatch) {
    console.warn('[Security] Session fingerprint mismatch - possible session hijacking');
    return false;
  }
  
  if (!nonCriticalFieldsMatch) {
    console.warn('[Security] Non-critical fingerprint fields changed');
    // Still allow, but log for monitoring
  }
  
  return true;
};

/**
 * Store session fingerprint
 */
export const storeSessionFingerprint = async (fingerprint: SessionFingerprint): Promise<void> => {
  localStorage.setItem('session_fingerprint', JSON.stringify(fingerprint));
};

/**
 * Get stored session fingerprint
 */
export const getStoredSessionFingerprint = async (): Promise<SessionFingerprint | null> => {
  const stored = localStorage.getItem('session_fingerprint');
  return stored ? JSON.parse(stored) : null;
};
