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

  // Show loading skeleton while checking auth or role
  // This prevents the brief "Access Denied" flash during role loading
  if (authLoading || roleLoading) {
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

  // Not authenticated - redirect to admin login (root of admin domain)
  if (!user) {
    if (!isAdminDomain()) {
      redirectToAdminDomain('/');
      return null;
    }
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Only check admin access after role has finished loading
  // This prevents the "Access Denied" flash while role is being fetched
  if (!hasAdminAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
