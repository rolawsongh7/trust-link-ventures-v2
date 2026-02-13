/**
 * Domain utility functions for subdomain-based routing
 * Enables admin portal on admin.trustlinkventures.com
 * and main site on trustlinkventures.com
 * 
 * Note: Uses centralized environment detection from env.ts
 */

import { isAdminDomain as checkIsAdminDomain, isNativeApp, isPlatformAdminDomain, isPlatformPublicDomain } from './env';

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

export const getPlatformAdminUrl = (path: string = ''): string => {
  return `${window.location.protocol}//admin.heseddigitech.com${path}`;
};

export const getPlatformPublicUrl = (path: string = ''): string => {
  return `${window.location.protocol}//heseddigitech.com${path}`;
};

export const redirectToAdminDomain = (path: string = '/') => {
  const isLovablePreview = window.location.hostname.includes('lovable.app') || window.location.hostname.includes('lovableproject.com');
  if (isLovablePreview) return;
  
  if (!isAdminDomain()) {
    window.location.href = getAdminUrl(path);
  }
};

export const redirectToMainDomain = (path: string = '/') => {
  const isLovablePreview = window.location.hostname.includes('lovable.app') || window.location.hostname.includes('lovableproject.com');
  if (isLovablePreview) return;
  
  if (isAdminDomain()) {
    window.location.href = getMainUrl(path);
  }
};

export const navigateToPublicSite = () => {
  const isLovablePreview = window.location.hostname.includes('lovable.app') || window.location.hostname.includes('lovableproject.com');
  if (isLovablePreview) {
    window.location.href = '/';
  } else {
    window.location.href = getMainUrl('/');
  }
};

export const navigateToAdminPortal = () => {
  if (isNativeApp()) {
    console.warn('[navigateToAdminPortal] Admin access blocked in native app');
    return;
  }
  
  const isLovablePreview = window.location.hostname.includes('lovable.app') || window.location.hostname.includes('lovableproject.com');
  if (isLovablePreview) {
    window.location.href = '/admin/dashboard';
  } else {
    window.location.href = getAdminUrl('/admin/dashboard');
  }
};

export { isPlatformAdminDomain, isPlatformPublicDomain };
