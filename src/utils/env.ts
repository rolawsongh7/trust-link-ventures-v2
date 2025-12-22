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
  
  // buildnatively adds 'Natively' to user agent
  if (userAgent.includes('Natively')) return true;
  
  // Check for is_native URL parameter
  if (window.location.search.includes('is_native=true')) return true;
  
  // Generic WebView detection for iOS (WKWebView)
  if ((window as any).webkit?.messageHandlers) return true;
  
  // Generic Android WebView detection (contains "; wv)" in user agent)
  if (/; wv\)/.test(userAgent) && /Android/.test(userAgent)) return true;
  
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
