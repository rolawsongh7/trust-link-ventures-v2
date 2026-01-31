// Feature Flags (Kill Switches) Hook
// Phase 3B: Global Control for Financial Leverage Features

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type FeatureKey = 
  | 'credit_terms_global' 
  | 'subscription_enforcement' 
  | 'loyalty_benefits_global';

export interface FeatureFlag {
  id: string;
  feature_key: FeatureKey;
  enabled: boolean;
  disabled_by: string | null;
  disabled_at: string | null;
  disabled_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface ToggleFlagParams {
  featureKey: FeatureKey;
  enabled: boolean;
  reason?: string;
}

const FEATURE_LABELS: Record<FeatureKey, string> = {
  credit_terms_global: 'Customer Credit Terms',
  subscription_enforcement: 'Subscription Enforcement',
  loyalty_benefits_global: 'Loyalty Benefits',
};

const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  credit_terms_global: 'Controls Net 7/14/30 payment terms for trusted customers',
  subscription_enforcement: 'Controls subscription status warnings and enforcement',
  loyalty_benefits_global: 'Controls priority processing, dedicated manager, and faster SLA benefits',
};

/**
 * Get human-readable label for a feature key
 */
export function getFeatureLabel(key: FeatureKey): string {
  return FEATURE_LABELS[key] || key;
}

/**
 * Get description for a feature key
 */
export function getFeatureDescription(key: FeatureKey): string {
  return FEATURE_DESCRIPTIONS[key] || '';
}

/**
 * Fetch all feature flags
 */
export function useFeatureFlags() {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_feature_flags')
        .select('*')
        .order('feature_key');

      if (error) throw error;
      return (data || []) as FeatureFlag[];
    },
  });
}

/**
 * Check if a specific feature is enabled
 */
export function useIsFeatureEnabled(featureKey: FeatureKey) {
  const { data: flags, isLoading } = useFeatureFlags();
  
  const flag = flags?.find(f => f.feature_key === featureKey);
  
  return {
    enabled: flag?.enabled ?? true, // Default to enabled if not found
    isLoading,
    flag,
  };
}

/**
 * Mutations for feature flag management
 */
export function useFeatureFlagMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleFlag = useMutation({
    mutationFn: async ({ featureKey, enabled, reason }: ToggleFlagParams) => {
      const { data, error } = await supabase.rpc('toggle_feature_flag', {
        p_feature_key: featureKey,
        p_enabled: enabled,
        p_reason: reason || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to toggle feature flag');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      
      const label = getFeatureLabel(variables.featureKey);
      toast({
        title: variables.enabled ? 'Feature Enabled' : 'Feature Disabled',
        description: `${label} has been ${variables.enabled ? 'enabled' : 'disabled'} globally.`,
        variant: variables.enabled ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Toggle Feature',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    toggleFlag,
    isLoading: toggleFlag.isPending,
  };
}
