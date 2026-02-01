// Multi-Tenancy Hook
// Phase 5.4: Provides tenant context for the current user

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleAuth } from './useRoleAuth';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'trial';
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

/**
 * Get the current user's tenant association
 */
export function useTenant() {
  const { user } = useAuth();
  const userId = user?.id;
  const isAuthenticated = !!user;

  return useQuery({
    queryKey: ['tenant', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Use raw query since types may not be generated yet
      const { data: tenantUser, error: tuError } = await (supabase as any)
        .from('tenant_users')
        .select(`
          id,
          tenant_id,
          user_id,
          role,
          created_at,
          tenant:tenants (
            id,
            name,
            slug,
            status,
            settings,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .single();

      if (tuError) {
        // User might not be associated with a tenant yet
        if (tuError.code === 'PGRST116') {
          return null;
        }
        throw tuError;
      }

      return {
        tenantUser: {
          id: tenantUser.id,
          tenant_id: tenantUser.tenant_id,
          user_id: tenantUser.user_id,
          role: tenantUser.role as TenantUser['role'],
          created_at: tenantUser.created_at,
        },
        tenant: tenantUser.tenant as Tenant,
      };
    },
    enabled: isAuthenticated && !!userId,
  });
}

/**
 * List all tenants (super admin only)
 */
export function useAllTenants() {
  const { hasSuperAdminAccess } = useRoleAuth();

  return useQuery({
    queryKey: ['tenants', 'all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tenants')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Tenant[];
    },
    enabled: hasSuperAdminAccess,
  });
}

/**
 * Get tenant by ID (super admin only)
 */
export function useTenantById(tenantId: string | null) {
  const { hasSuperAdminAccess } = useRoleAuth();

  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await (supabase as any)
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      return data as Tenant;
    },
    enabled: hasSuperAdminAccess && !!tenantId,
  });
}
