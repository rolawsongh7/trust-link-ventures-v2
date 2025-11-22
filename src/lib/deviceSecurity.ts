import { isNativeApp } from '@/utils/env';
import { Capacitor } from '@capacitor/core';

export interface DeviceSecurityCheck {
  isJailbroken: boolean;
  isDebugMode: boolean;
  isEmulator: boolean;
  warnings: string[];
}

/**
 * Detect if device is jailbroken/rooted
 * Note: This is not 100% reliable, determined attackers can bypass
 */
export const detectJailbreak = async (): Promise<boolean> => {
  // Only check on native apps
  if (!isNativeApp()) return false;

  const platform = Capacitor.getPlatform();
  
  if (platform === 'ios') {
    return await detectIOSJailbreak();
  } else if (platform === 'android') {
    return await detectAndroidRoot();
  }
  
  return false;
};

/**
 * iOS jailbreak detection
 */
const detectIOSJailbreak = async (): Promise<boolean> => {
  // Check if suspicious paths exist
  // Note: This requires native implementation
  // For now, return false (implement via Capacitor plugin if needed)
  
  return false; // Placeholder
};

/**
 * Android root detection
 */
const detectAndroidRoot = async (): Promise<boolean> => {
  // Check if suspicious paths exist
  // Note: This requires native implementation
  // For now, return false (implement via Capacitor plugin if needed)
  
  return false; // Placeholder
};

/**
 * Comprehensive device security check
 */
export const performDeviceSecurityCheck = async (): Promise<DeviceSecurityCheck> => {
  const warnings: string[] = [];
  
  // Check if jailbroken
  const isJailbroken = await detectJailbreak();
  if (isJailbroken) {
    warnings.push('Device appears to be jailbroken/rooted');
  }
  
  // Check if debug mode
  const isDebugMode = import.meta.env.MODE === 'development';
  if (isDebugMode) {
    warnings.push('App running in debug mode');
  }
  
  // Check if emulator
  const isEmulator = await detectEmulator();
  if (isEmulator) {
    warnings.push('App running on emulator/simulator');
  }
  
  return {
    isJailbroken,
    isDebugMode,
    isEmulator,
    warnings,
  };
};

/**
 * Detect if running on emulator
 */
const detectEmulator = async (): Promise<boolean> => {
  if (!isNativeApp()) return false;
  
  const platform = Capacitor.getPlatform();
  
  if (platform === 'ios') {
    // Check if running on iOS simulator
    return navigator.userAgent.includes('Simulator');
  } else if (platform === 'android') {
    // Check for Android emulator indicators
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('generic') || ua.includes('emulator') || ua.includes('sdk');
  }
  
  return false;
};

/**
 * Block app usage if device is compromised
 */
export const enforceDeviceSecurity = async (): Promise<boolean> => {
  const securityCheck = await performDeviceSecurityCheck();
  
  if (securityCheck.isJailbroken) {
    // In production, you might want to block the app entirely
    console.error('[Security] App usage blocked: Device is jailbroken/rooted');
    return false;
  }
  
  if (securityCheck.warnings.length > 0) {
    console.warn('[Security] Device security warnings:', securityCheck.warnings);
  }
  
  return true;
};
