import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { Skeleton } from '@/components/ui/skeleton';

interface SupplierProtectedRouteProps {
  children: React.ReactNode;
}

export const SupplierProtectedRoute: React.FC<SupplierProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { hasSupplierAccess, loading: roleLoading } = useRoleAuth();
  const location = useLocation();

  const loading = authLoading || roleLoading;

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

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!hasSupplierAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};