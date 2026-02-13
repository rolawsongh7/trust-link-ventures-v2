/**
 * Environment detection utilities for native vs web environments
 * Used to control feature availability and routing based on platform
 */

import { Capacitor } from '@capacitor/core';

/**
 * Detect if app is running as a native Capacitor app (iOS/Android) or in a WebView wrapper
 * Returns true for native platforms and WebView wrappers (like buildnatively.com), false for regular web
 */
export const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check Capacitor native platform first
  if (Capacitor.isNativePlatform()) return true;
  
  // Check for buildnatively.com WebView wrapper
  const userAgent = navigator.userAgent || '';
  
  // buildnatively adds 'Natively' to user agent - this is the reliable check
  if (userAgent.includes('Natively')) return true;
  
  // Allow explicit override via URL parameter (for testing)
  if (window.location.search.includes('is_native=true')) return true;
  
  // REMOVED: Generic WebView detection (webkit.messageHandlers, Android wv)
  // These caused false positives on regular mobile browsers like Chrome/Safari/Firefox
  
  return false;
};

/**
 * Get the appropriate home URL based on platform
 * Returns /hub for native apps, / for web
 */
export const getNativeHomeUrl = (): string => {
  return isNativeApp() ? '/hub' : '/';
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

/**
 * Detect if running on the Platform Admin domain (admin.heseddigitech.com)
 * In preview, detected via /platform path prefix
 */
export const isPlatformAdminDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (isNativeApp()) return false;
  
  if (isPreviewDomain()) {
    const path = window.location.pathname;
    // /platform/home is the marketing page preview, not admin
    return path.startsWith('/platform') && !path.startsWith('/platform/home');
  }
  
  return window.location.hostname === 'admin.heseddigitech.com';
};

/**
 * Detect if running on the Platform Marketing domain (heseddigitech.com)
 * In preview, not directly accessible (use /platform/home for testing)
 */
export const isPlatformPublicDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (isNativeApp()) return false;
  
  const hostname = window.location.hostname;
  return hostname === 'heseddigitech.com' || hostname === 'www.heseddigitech.com';
};
