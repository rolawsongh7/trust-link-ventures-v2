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
 * Enhanced credit eligibility interface from check_credit_eligibility_v2 RPC
 */
export interface CreditEligibilityV2 {
  eligible: boolean;
  reasons: string[];
  credit_limit: number;
  current_balance: number;
  available_credit: number;
  net_terms: string;
  credit_status: string;
  trust_tier: string;
  trust_score: number;
  loyalty_tier: string;
  has_overdue: boolean;
}

/**
 * Check credit eligibility for a customer (v2 with trust tier integration)
 */
export function useCheckCreditEligibility(customerId: string | undefined) {
  return useQuery({
    queryKey: ['credit-eligibility', customerId],
    queryFn: async () => {
      if (!customerId) return null;

      // Use v2 RPC with trust tier integration (cast to any since types may not be generated yet)
      const { data, error } = await (supabase as any).rpc('check_credit_eligibility_v2', {
        p_customer_id: customerId,
      });

      if (error) {
        // Fallback to v1 if v2 doesn't exist yet
        if (error.code === 'PGRST202') {
          const { data: v1Data, error: v1Error } = await supabase.rpc('check_credit_eligibility', {
            p_customer_id: customerId,
          });
          if (v1Error) throw v1Error;
          return v1Data as unknown as CreditEligibility;
        }
        throw error;
      }
      
      // Map v2 response to CreditEligibility interface for compatibility
      const result = data as CreditEligibilityV2;
      return {
        eligible: result.eligible,
        lifetime_orders: 0, // Not returned from v2
        loyalty_tier: result.loyalty_tier,
        trust_tier: result.trust_tier,
        has_overdue_invoices: false, // Not returned from v2
        has_overdue_credit: result.has_overdue,
        available_credit: result.available_credit,
        missing_requirements: result.reasons,
      } as CreditEligibility;
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

/**
 * Fetch credit ledger (orders using credit) for a customer
 */
export function useCustomerCreditLedger(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-credit-ledger', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('customer_credit_ledger')
        .select('*')
        .eq('customer_id', customerId)
        .order('order_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });
}

interface ApplyCreditParams {
  orderId: string;
}

interface ReleaseCreditParams {
  orderId: string;
}

interface RecordPaymentParams {
  orderId: string;
  amountPaid: number;
}

/**
 * Mutations for order-level credit operations (Phase 5.2)
 */
export function useOrderCreditMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const applyCreditToOrder = useMutation({
    mutationFn: async ({ orderId }: ApplyCreditParams) => {
      const { data, error } = await supabase.rpc('apply_credit_to_order', {
        p_order_id: orderId,
      });

      if (error) throw error;
      
      const result = data as { 
        success: boolean; 
        error?: string; 
        order_id?: string;
        credit_used?: number;
        due_date?: string;
        new_balance?: number;
      };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to apply credit to order');
      }
      
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customer-credit-terms'] });
      queryClient.invalidateQueries({ queryKey: ['customer-credit-ledger'] });
      toast({
        title: 'Credit Applied',
        description: `Payment due by ${result.due_date ? new Date(result.due_date).toLocaleDateString() : 'TBD'}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Apply Credit',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const releaseCreditFromOrder = useMutation({
    mutationFn: async ({ orderId }: ReleaseCreditParams) => {
      const { data, error } = await supabase.rpc('release_credit_from_order', {
        p_order_id: orderId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to release credit from order');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customer-credit-terms'] });
      queryClient.invalidateQueries({ queryKey: ['customer-credit-ledger'] });
      toast({
        title: 'Credit Released',
        description: 'Credit has been returned to available balance.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Release Credit',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const recordCreditPayment = useMutation({
    mutationFn: async ({ orderId, amountPaid }: RecordPaymentParams) => {
      const { data, error } = await supabase.rpc('record_credit_payment', {
        p_order_id: orderId,
        p_amount: amountPaid,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to record credit payment');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customer-credit-terms'] });
      queryClient.invalidateQueries({ queryKey: ['customer-credit-ledger'] });
      toast({
        title: 'Payment Recorded',
        description: 'Credit balance has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Record Payment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    applyCreditToOrder,
    releaseCreditFromOrder,
    recordCreditPayment,
  };
}
