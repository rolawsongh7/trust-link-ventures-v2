import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { isAdminDomain, redirectToAdminDomain } from '@/utils/domainUtils';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { hasAdminAccess, loading: roleLoading } = useRoleAuth();
  const location = useLocation();
  const [mfaRequired, setMfaRequired] = React.useState<boolean | null>(null);
  const [checkingMFA, setCheckingMFA] = React.useState(true);

  // Redirect to admin subdomain if not already there
  React.useEffect(() => {
    if (!isAdminDomain()) {
      redirectToAdminDomain(location.pathname);
    }
  }, [location.pathname]);

  // Check if admin user has MFA enabled
  React.useEffect(() => {
    const checkMFARequirement = async () => {
      if (!user || !hasAdminAccess) {
        setCheckingMFA(false);
        return;
      }

      try {
        const { data: mfaSettings } = await supabase
          .from('user_mfa_settings')
          .select('enabled')
          .eq('user_id', user.id)
          .single();

        // For admin users, MFA should be enabled
        const mfaEnabled = mfaSettings?.enabled || false;
        setMfaRequired(!mfaEnabled);
      } catch (error) {
        console.error('Error checking MFA:', error);
        setMfaRequired(false);
      } finally {
        setCheckingMFA(false);
      }
    };

    checkMFARequirement();
  }, [user, hasAdminAccess]);

  // Show MFA setup warning if required (but allow access)
  React.useEffect(() => {
    if (mfaRequired && user) {
      console.warn('[Security] Admin user should enable MFA:', user.email);
    }
  }, [mfaRequired, user]);

  // Wait for all loading states to complete
  const loading = authLoading || roleLoading || checkingMFA;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to admin login
  if (!user) {
    const isLovablePreview = window.location.hostname.includes('lovableproject.com');
    
    if (isLovablePreview) {
      // In preview mode, redirect to /admin/login
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    
    if (!isAdminDomain()) {
      redirectToAdminDomain('/');
      return null;
    }
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // IMPORTANT: Only check hasAdminAccess after loading is complete
  // This prevents showing "Access Denied" during role fetching
  if (!hasAdminAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
