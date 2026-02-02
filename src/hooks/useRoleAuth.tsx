import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'super_admin' | 'admin' | 'sales_rep' | 'user';

interface UseRoleAuthReturn {
  role: UserRole | null;
  loading: boolean;
  hasSuperAdminAccess: boolean;
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
      
      // Helper function to check role with error handling
      const checkRole = async (roleToCheck: string): Promise<boolean> => {
        const { data, error } = await supabase.rpc('check_user_role', {
          check_user_id: user.id,
          required_role: roleToCheck
        });
        
        if (error) {
          console.error(`[useRoleAuth] Error checking ${roleToCheck} role:`, error);
          return false;
        }
        
        return data === true;
      };
      
      // Check for super_admin first
      const isSuperAdmin = await checkRole('super_admin');
      console.log('[useRoleAuth] Role check:', { userId: user.id, isSuperAdmin });

      if (isSuperAdmin) {
        setRole('super_admin');
      } else {
        // Check other roles
        const isAdmin = await checkRole('admin');
        const isSalesRep = await checkRole('sales_rep');

        console.log('[useRoleAuth] Additional role checks:', { isAdmin, isSalesRep });

        if (isAdmin) {
          setRole('admin');
        } else if (isSalesRep) {
          setRole('sales_rep');
        } else {
          setRole('user');
        }
      }
    } catch (error) {
      console.error('[useRoleAuth] Error fetching user role:', error);
      setRole('user'); // Default to user role on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRole();
  }, [user]);

  const hasSuperAdminAccess = role === 'super_admin';
  const hasAdminAccess = role === 'super_admin' || role === 'admin';
  const hasSalesAccess = role === 'super_admin' || role === 'admin' || role === 'sales_rep';

  const checkRole = (requiredRole: UserRole): boolean => {
    if (!role) return false;
    
    // Super admin can access everything
    if (role === 'super_admin') return true;
    
    // Admin can access everything except super_admin
    if (role === 'admin' && requiredRole !== 'super_admin') return true;
    
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
    hasSuperAdminAccess,
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