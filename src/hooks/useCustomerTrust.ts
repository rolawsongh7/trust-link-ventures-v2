/**
 * Phase 5.1: Customer Trust & Tiering Hooks
 * 
 * Provides data fetching and mutations for customer trust profiles.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TrustTier, TrustProfile, TrustHistory, TrustEvaluationResult } from '@/utils/trustHelpers';
import { getDefaultTrustProfile } from '@/utils/trustHelpers';

/**
 * Fetch a customer's trust profile
 */
export function useCustomerTrust(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-trust', customerId],
    queryFn: async (): Promise<TrustProfile | null> => {
      if (!customerId) return null;

      const { data, error } = await supabase
        .from('customer_trust_profiles')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching trust profile:', error);
        return null;
      }

      // If no profile exists, return a default "new" profile
      if (!data) {
        return getDefaultTrustProfile(customerId) as TrustProfile;
      }

      return data as TrustProfile;
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

/**
 * Fetch trust history for a customer
 */
export function useCustomerTrustHistory(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-trust-history', customerId],
    queryFn: async (): Promise<TrustHistory[]> => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('customer_trust_history')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching trust history:', error);
        return [];
      }

      return (data || []) as TrustHistory[];
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000
  });
}

/**
 * Evaluate (re-calculate) a customer's trust tier
 */
export function useEvaluateCustomerTrust() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (customerId: string): Promise<TrustEvaluationResult> => {
      const { data, error } = await supabase
        .rpc('evaluate_customer_trust', { p_customer_id: customerId });

      if (error) throw error;
      return data as unknown as TrustEvaluationResult;
    },
    onSuccess: (data, customerId) => {
      queryClient.invalidateQueries({ queryKey: ['customer-trust', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-trust-history', customerId] });
      
      if (data.skipped) {
        toast({
          title: 'Evaluation Skipped',
          description: data.reason || 'Manual override is active',
        });
      } else {
        toast({
          title: 'Trust Evaluated',
          description: `Customer tier: ${data.tier} (Score: ${data.score})`,
        });
      }
    },
    onError: (error) => {
      console.error('Error evaluating trust:', error);
      toast({
        title: 'Evaluation Failed',
        description: 'Failed to evaluate customer trust',
        variant: 'destructive',
      });
    }
  });
}

/**
 * Override a customer's trust tier (super admin only)
 */
export function useOverrideCustomerTrust() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      customerId,
      newTier,
      reason
    }: {
      customerId: string;
      newTier: TrustTier;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .rpc('override_customer_trust', {
          p_customer_id: customerId,
          p_new_tier: newTier,
          p_reason: reason
        });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string; new_tier?: string };
      if (!result.success) {
        throw new Error(result.message || 'Override failed');
      }
      
      return result;
    },
    onSuccess: (data, { customerId, newTier }) => {
      queryClient.invalidateQueries({ queryKey: ['customer-trust', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-trust-history', customerId] });
      
      toast({
        title: 'Trust Tier Overridden',
        description: `Customer tier set to: ${newTier}`,
      });
    },
    onError: (error: Error) => {
      console.error('Error overriding trust:', error);
      toast({
        title: 'Override Failed',
        description: error.message || 'Failed to override trust tier',
        variant: 'destructive',
      });
    }
  });
}

/**
 * Clear a customer's trust override (super admin only)
 */
export function useClearCustomerTrustOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (customerId: string) => {
      const { data, error } = await supabase
        .rpc('clear_customer_trust_override', { p_customer_id: customerId });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.message || 'Clear override failed');
      }
      
      return result;
    },
    onSuccess: (_, customerId) => {
      queryClient.invalidateQueries({ queryKey: ['customer-trust', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-trust-history', customerId] });
      
      toast({
        title: 'Override Cleared',
        description: 'Automatic evaluation will apply on next run',
      });
    },
    onError: (error: Error) => {
      console.error('Error clearing override:', error);
      toast({
        title: 'Clear Failed',
        description: error.message || 'Failed to clear trust override',
        variant: 'destructive',
      });
    }
  });
}
