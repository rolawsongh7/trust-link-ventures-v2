import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'sales_rep' | 'user';

interface UseRoleAuthReturn {
  role: UserRole | null;
  loading: boolean;
  hasAdminAccess: boolean;
  hasSalesAccess: boolean;
  checkRole: (requiredRole: UserRole) => boolean;
  refetchRole: () => Promise<void>;
}

export const useRoleAuth = (): UseRoleAuthReturn => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async () => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Use the check_user_role function to verify user role
      const { data: isAdmin } = await supabase.rpc('check_user_role', {
        check_user_id: user.id,
        required_role: 'admin'
      });

      const { data: isSalesRep } = await supabase.rpc('check_user_role', {
        check_user_id: user.id,
        required_role: 'sales_rep'
      });

      if (isAdmin) {
        setRole('admin');
      } else if (isSalesRep) {
        setRole('sales_rep');
      } else {
        setRole('user');
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole('user'); // Default to user role on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRole();
  }, [user]);

  const hasAdminAccess = role === 'admin';
  const hasSalesAccess = role === 'admin' || role === 'sales_rep';

  const checkRole = (requiredRole: UserRole): boolean => {
    if (!role) return false;
    
    // Admin can access everything
    if (role === 'admin') return true;
    
    // Sales rep can access sales-related features
    if (role === 'sales_rep' && (requiredRole === 'sales_rep' || requiredRole === 'user')) {
      return true;
    }
    
    // Exact role match
    return role === requiredRole;
  };

  const refetchRole = async () => {
    await fetchUserRole();
  };

  return {
    role,
    loading,
    hasAdminAccess,
    hasSalesAccess,
    checkRole,
    refetchRole
  };
};

// Higher-order component for role-based protection
export const withRoleAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: UserRole
) => {
  return (props: P) => {
    const { checkRole, loading } = useRoleAuth();

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!checkRole(requiredRole)) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-destructive">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have permission to access this feature.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};