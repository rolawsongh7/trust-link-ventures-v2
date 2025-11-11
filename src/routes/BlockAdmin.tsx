import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isNativeApp } from '@/utils/env';

/**
 * Security component that prevents access to admin routes in native mobile apps
 * Silently redirects to home page if user tries to access /admin/*
 */
export const BlockAdmin: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Only block in native apps
    if (!isNativeApp()) return;

    // Check if trying to access admin routes
    if (pathname.startsWith('/admin')) {
      console.warn('[BlockAdmin] Admin access blocked in native app, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [pathname, navigate]);

  return null; // This component doesn't render anything
};
