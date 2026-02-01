// Feature Guard Hook
// Phase 5.5: Platform governance - checks both global flags and tenant eligibility

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './useTenant';
import { useIsFeatureEnabled, type FeatureKey } from './useFeatureFlags';

export type TenantFeatureKey = 
  | 'quotes'
  | 'credit_terms'
  | 'loyalty_program'
  | 'payment_proofs'
  | 'standing_orders'
  | 'auto_invoicing';

/**
 * Check if a feature is available for the current tenant
 * This combines global kill switches with tenant-specific eligibility
 */
export function useCanUseFeature(featureKey: TenantFeatureKey) {
  const { data: tenantData, isLoading: tenantLoading } = useTenant();
  const tenantId = tenantData?.tenant?.id;

  return useQuery({
    queryKey: ['can-use-feature', tenantId, featureKey],
    queryFn: async () => {
      if (!tenantId) {
        // No tenant = use default behavior (enabled)
        return { allowed: true, reason: null };
      }

      // Use raw RPC call since types may not be generated yet
      const { data, error } = await (supabase as any).rpc('can_tenant_use_feature', {
        p_tenant_id: tenantId,
        p_feature_key: featureKey,
      });

      if (error) throw error;
      return data as { allowed: boolean; reason: string | null };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Check platform maintenance mode
 */
export function usePlatformMaintenanceMode() {
  return useQuery({
    queryKey: ['platform-maintenance-mode'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_feature_flags')
        .select('enabled, disabled_reason')
        .eq('feature_key', 'platform_maintenance_mode')
        .single();

      if (error) {
        // If not found, maintenance mode is off
        if (error.code === 'PGRST116') {
          return { isMaintenanceMode: false, reason: null };
        }
        throw error;
      }

      return {
        isMaintenanceMode: data.enabled,
        reason: data.disabled_reason,
      };
    },
    staleTime: 30 * 1000, // Check every 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Combined feature check that considers:
 * 1. Global kill switches
 * 2. Tenant eligibility
 * 3. Platform maintenance mode
 */
export function useFeatureAccess(
  globalFeatureKey: FeatureKey | null,
  tenantFeatureKey: TenantFeatureKey | null
) {
  const { enabled: globalEnabled, isLoading: globalLoading } = useIsFeatureEnabled(
    globalFeatureKey || 'credit_terms_global'
  );
  const { data: tenantAccess, isLoading: tenantLoading } = useCanUseFeature(
    tenantFeatureKey || 'credit_terms'
  );
  const { data: maintenance, isLoading: maintenanceLoading } = usePlatformMaintenanceMode();

  const isLoading = globalLoading || tenantLoading || maintenanceLoading;

  // Determine access
  let hasAccess = true;
  let blockReason: string | null = null;

  if (maintenance?.isMaintenanceMode) {
    hasAccess = false;
    blockReason = maintenance.reason || 'Platform is in maintenance mode';
  } else if (globalFeatureKey && !globalEnabled) {
    hasAccess = false;
    blockReason = 'This feature is currently disabled globally';
  } else if (tenantFeatureKey && tenantAccess && !tenantAccess.allowed) {
    hasAccess = false;
    blockReason = tenantAccess.reason || 'This feature is not available for your organization';
  }

  return {
    hasAccess,
    blockReason,
    isLoading,
    isMaintenanceMode: maintenance?.isMaintenanceMode || false,
    isGloballyEnabled: globalEnabled,
    isTenantEligible: tenantAccess?.allowed ?? true,
  };
}
