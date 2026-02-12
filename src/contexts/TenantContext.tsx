import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TenantContextValue {
  currentTenantId: string | null;
  currentTenantRole: string | null;
  tenantName: string | null;
  tenantLoading: boolean;
  withTenantId: <T extends Record<string, unknown>>(obj: T) => T & { tenant_id: string };
}

const TenantContext = createContext<TenantContextValue>({
  currentTenantId: null,
  currentTenantRole: null,
  tenantName: null,
  tenantLoading: false,
  withTenantId: (obj) => ({ ...obj, tenant_id: '' }),
});

export function useTenantContext() {
  return useContext(TenantContext);
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-context', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data: tenantUser, error } = await (supabase as any)
        .from('tenant_users')
        .select(`
          tenant_id,
          role,
          tenant:tenants (
            id,
            name,
            slug,
            status
          )
        `)
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return {
        tenantId: tenantUser.tenant_id as string,
        role: tenantUser.role as string,
        tenantName: tenantUser.tenant?.name as string | null,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 30, // 30 minutes - tenant rarely changes
  });

  const value = useMemo<TenantContextValue>(() => ({
    currentTenantId: data?.tenantId ?? null,
    currentTenantRole: data?.role ?? null,
    tenantName: data?.tenantName ?? null,
    tenantLoading: isLoading,
    withTenantId: <T extends Record<string, unknown>>(obj: T) => ({
      ...obj,
      tenant_id: data?.tenantId ?? '',
    }),
  }), [data, isLoading]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}
