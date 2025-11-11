/**
 * Domain utility functions for subdomain-based routing
 * Enables admin portal on admin.trustlinkventures.com
 * and main site on trustlinkventures.com
 * 
 * Note: Uses centralized environment detection from env.ts
 */

import { isAdminDomain as checkIsAdminDomain, isNativeApp } from './env';

export const isAdminDomain = checkIsAdminDomain;

export const isMainDomain = (): boolean => {
  return !isAdminDomain();
};

export const getAdminUrl = (path: string = ''): string => {
  const protocol = window.location.protocol;
  const mainHost = window.location.hostname.replace(/^admin\./, '');
  return `${protocol}//admin.${mainHost}${path}`;
};

export const getMainUrl = (path: string = ''): string => {
  const protocol = window.location.protocol;
  const mainHost = window.location.hostname.replace(/^admin\./, '');
  return `${protocol}//${mainHost}${path}`;
};

export const redirectToAdminDomain = (path: string = '/') => {
  // Skip redirect in Lovable preview - use path-based routing
  const isLovablePreview = window.location.hostname.includes('lovable.app') || window.location.hostname.includes('lovableproject.com');
  if (isLovablePreview) return;
  
  if (!isAdminDomain()) {
    window.location.href = getAdminUrl(path);
  }
};

export const redirectToMainDomain = (path: string = '/') => {
  // Skip redirect in Lovable preview - use path-based routing
  const isLovablePreview = window.location.hostname.includes('lovable.app') || window.location.hostname.includes('lovableproject.com');
  if (isLovablePreview) return;
  
  if (isAdminDomain()) {
    window.location.href = getMainUrl(path);
  }
};

export const navigateToPublicSite = () => {
  const isLovablePreview = window.location.hostname.includes('lovable.app') || window.location.hostname.includes('lovableproject.com');
  if (isLovablePreview) {
    // In preview, navigate directly to home page (both routes available)
    window.location.href = '/';
  } else {
    // In production, redirect to main domain
    window.location.href = getMainUrl('/');
  }
};

export const navigateToAdminPortal = () => {
  // Block in native apps
  if (isNativeApp()) {
    console.warn('[navigateToAdminPortal] Admin access blocked in native app');
    return;
  }
  
  const isLovablePreview = window.location.hostname.includes('lovable.app') || window.location.hostname.includes('lovableproject.com');
  if (isLovablePreview) {
    // In preview, navigate to admin path
    window.location.href = '/admin/dashboard';
  } else {
    // In production, redirect to admin subdomain
    window.location.href = getAdminUrl('/admin/dashboard');
  }
};
