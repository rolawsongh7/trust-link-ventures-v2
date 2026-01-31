// Customer Credit Terms Hook
// Phase 3B: Controlled Financial Leverage

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CreditTerms, CreditEligibility, NetTerms } from '@/utils/creditHelpers';

interface ApproveCreditParams {
  customerId: string;
  creditLimit: number;
  netTerms: NetTerms;
}

interface SuspendCreditParams {
  customerId: string;
  reason?: string;
}

interface AdjustLimitParams {
  customerId: string;
  newLimit: number;
  reason?: string;
}

/**
 * Fetch credit terms for a specific customer
 */
export function useCustomerCreditTerms(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-credit-terms', customerId],
    queryFn: async () => {
      if (!customerId) return null;

      const { data, error } = await supabase
        .from('customer_credit_terms')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (error) throw error;
      return data as CreditTerms | null;
    },
    enabled: !!customerId,
  });
}

/**
 * Check credit eligibility for a customer
 */
export function useCheckCreditEligibility(customerId: string | undefined) {
  return useQuery({
    queryKey: ['credit-eligibility', customerId],
    queryFn: async () => {
      if (!customerId) return null;

      const { data, error } = await supabase.rpc('check_credit_eligibility', {
        p_customer_id: customerId,
      });

      if (error) throw error;
      return data as unknown as CreditEligibility;
    },
    enabled: !!customerId,
  });
}

/**
 * Mutations for credit terms management
 */
export function useCreditTermsMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const approveCreditTerms = useMutation({
    mutationFn: async ({ customerId, creditLimit, netTerms }: ApproveCreditParams) => {
      const { data, error } = await supabase.rpc('approve_credit_terms', {
        p_customer_id: customerId,
        p_credit_limit: creditLimit,
        p_net_terms: netTerms,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to approve credit terms');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-credit-terms', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['credit-eligibility', variables.customerId] });
      toast({
        title: 'Credit Terms Approved',
        description: 'Customer credit terms have been activated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Approve Credit',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const suspendCreditTerms = useMutation({
    mutationFn: async ({ customerId, reason }: SuspendCreditParams) => {
      const { data, error } = await supabase.rpc('suspend_credit_terms', {
        p_customer_id: customerId,
        p_reason: reason || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to suspend credit terms');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-credit-terms', variables.customerId] });
      toast({
        title: 'Credit Suspended',
        description: 'Customer credit terms have been suspended.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Suspend Credit',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const adjustCreditLimit = useMutation({
    mutationFn: async ({ customerId, newLimit, reason }: AdjustLimitParams) => {
      const { data, error } = await supabase.rpc('adjust_credit_limit', {
        p_customer_id: customerId,
        p_new_limit: newLimit,
        p_reason: reason || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to adjust credit limit');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-credit-terms', variables.customerId] });
      toast({
        title: 'Credit Limit Adjusted',
        description: 'Customer credit limit has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Adjust Limit',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const reactivateCreditTerms = useMutation({
    mutationFn: async ({ customerId, creditLimit, netTerms }: ApproveCreditParams) => {
      // Reactivation uses the same approve function
      const { data, error } = await supabase.rpc('approve_credit_terms', {
        p_customer_id: customerId,
        p_credit_limit: creditLimit,
        p_net_terms: netTerms,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to reactivate credit terms');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-credit-terms', variables.customerId] });
      toast({
        title: 'Credit Reactivated',
        description: 'Customer credit terms have been reactivated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Reactivate Credit',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    approveCreditTerms,
    suspendCreditTerms,
    adjustCreditLimit,
    reactivateCreditTerms,
  };
}
