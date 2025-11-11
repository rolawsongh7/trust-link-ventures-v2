/**
 * Environment detection utilities for native vs web environments
 * Used to control feature availability and routing based on platform
 */

import { Capacitor } from '@capacitor/core';

/**
 * Detect if app is running as a native Capacitor app (iOS/Android)
 * Returns true for native platforms, false for web
 */
export const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
};

/**
 * Detect if running on admin subdomain (web only)
 * Always returns false in native apps (admin is blocked in native)
 */
export const isAdminDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (isNativeApp()) return false; // Native apps never on admin domain
  
  const isLovablePreview = 
    window.location.hostname.includes('lovable.app') || 
    window.location.hostname.includes('lovableproject.com');
  
  if (isLovablePreview) {
    return window.location.pathname.startsWith('/admin');
  }
  
  return window.location.hostname.startsWith('admin.');
};

/**
 * Detect if running in Lovable preview environment
 */
export const isPreviewDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /\.lovable(project)?\.com$/i.test(window.location.hostname);
};

/**
 * Detect if running on main public domain
 */
export const isMainDomain = (): boolean => {
  return !isAdminDomain();
};
