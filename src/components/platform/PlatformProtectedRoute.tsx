import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleAuth } from '@/hooks/useRoleAuth';

interface PlatformProtectedRouteProps {
  children: React.ReactNode;
}

export function PlatformProtectedRoute({ children }: PlatformProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasSuperAdminAccess, loading: roleLoading } = useRoleAuth();

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading platform...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/platform/login" replace />;
  }

  if (!hasSuperAdminAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
          <p className="text-muted-foreground">Platform Admin requires super-admin privileges.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
