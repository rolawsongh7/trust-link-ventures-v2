// Tenant Feature Eligibility Hooks
// Phase 5.5: Query + mutation hooks for tenant_feature_eligibility table

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRoleAuth } from './useRoleAuth';
import { useToast } from './use-toast';

export type TenantFeatureKey = 
  | 'quotes'
  | 'credit_terms'
  | 'loyalty_program'
  | 'payment_proofs'
  | 'standing_orders'
  | 'auto_invoicing';

export const TENANT_FEATURE_KEYS: TenantFeatureKey[] = [
  'quotes',
  'credit_terms',
  'loyalty_program',
  'payment_proofs',
  'standing_orders',
  'auto_invoicing',
];

export const FEATURE_LABELS: Record<TenantFeatureKey, string> = {
  quotes: 'Quotes',
  credit_terms: 'Credit Terms',
  loyalty_program: 'Loyalty Program',
  payment_proofs: 'Payment Proofs',
  standing_orders: 'Standing Orders',
  auto_invoicing: 'Auto Invoicing',
};

export const FEATURE_DESCRIPTIONS: Record<TenantFeatureKey, string> = {
  quotes: 'Allow tenant to create and manage price quotes',
  credit_terms: 'Enable credit terms and net payment options',
  loyalty_program: 'Access to loyalty tiers and reward benefits',
  payment_proofs: 'Upload and manage payment proof documents',
  standing_orders: 'Create recurring standing orders',
  auto_invoicing: 'Automatic invoice generation on order completion',
};

export interface TenantFeatureEligibility {
  id: string;
  tenant_id: string;
  feature_key: TenantFeatureKey;
  enabled: boolean;
  disabled_reason: string | null;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Fetch all feature eligibility rows for a given tenant
 */
export function useTenantFeatureEligibility(tenantId: string | null) {
  const { hasSuperAdminAccess } = useRoleAuth();

  return useQuery({
    queryKey: ['tenant-feature-eligibility', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await (supabase as any)
        .from('tenant_feature_eligibility')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return (data || []) as TenantFeatureEligibility[];
    },
    enabled: hasSuperAdminAccess && !!tenantId,
  });
}

/**
 * Upsert a tenant feature eligibility row
 */
export function useUpdateTenantFeatureEligibility() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      tenantId,
      featureKey,
      enabled,
      disabledReason,
    }: {
      tenantId: string;
      featureKey: TenantFeatureKey;
      enabled: boolean;
      disabledReason?: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from('tenant_feature_eligibility')
        .upsert(
          {
            tenant_id: tenantId,
            feature_key: featureKey,
            enabled,
            disabled_reason: enabled ? null : (disabledReason || null),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,feature_key' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-feature-eligibility', variables.tenantId] });
      toast({
        title: 'Feature Updated',
        description: `${FEATURE_LABELS[variables.featureKey]} has been ${variables.enabled ? 'enabled' : 'disabled'}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update feature eligibility.',
        variant: 'destructive',
      });
    },
  });
}
