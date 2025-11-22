import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isNativeApp } from '@/utils/env';
import { Capacitor } from '@capacitor/core';
import { logSecurityEvent } from '@/lib/security';

/**
 * Security component that prevents access to admin routes in native mobile apps
 * Enhanced with deep link blocking and security event logging
 */
export const BlockAdmin: React.FC = () => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Only block in native apps
    if (!isNativeApp()) return;

    // Define all admin-related route patterns
    const adminPatterns = [
      '/admin',
      '/dashboard',
      '/crm',
      '/quotes',
      '/products',
      '/inventory',
      '/reports',
      '/settings',
      '/users',
      '/analytics'
    ];

    // Check if current path matches any admin pattern
    const isAdminRoute = adminPatterns.some(pattern => 
      pathname.toLowerCase().includes(pattern.toLowerCase())
    );

    // Also check query parameters for admin indicators
    const hasAdminQuery = search.toLowerCase().includes('admin');

    if (isAdminRoute || hasAdminQuery) {
      // Log security event
      logSecurityEvent('admin_access_blocked', {
        attempted_path: pathname + search,
        platform: Capacitor.getPlatform(),
        native_platform: Capacitor.isNativePlatform(),
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
      }, 'medium');

      console.warn(
        '[BlockAdmin] Admin access blocked in native app',
        `Path: ${pathname}${search}`,
        `Platform: ${Capacitor.getPlatform()}`
      );

      // Redirect to home page
      navigate('/', { replace: true });
    }
  }, [pathname, search, navigate]);

  return null; // This component doesn't render anything
};
