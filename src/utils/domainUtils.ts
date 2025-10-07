/**
 * Domain utility functions for subdomain-based routing
 * Enables admin portal on admin.trustlinkventures.com
 * and main site on trustlinkventures.com
 */

export const isAdminDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.startsWith('admin.');
};

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
  if (!isAdminDomain()) {
    window.location.href = getAdminUrl(path);
  }
};

export const redirectToMainDomain = (path: string = '/') => {
  if (isAdminDomain()) {
    window.location.href = getMainUrl(path);
  }
};
