// Customer Benefits Hook
// Phase 3B: Loyalty Benefits (Non-Monetary)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CustomerBenefit, BenefitType } from '@/utils/benefitHelpers';
import { getBenefitLabel } from '@/utils/benefitHelpers';

interface ToggleBenefitParams {
  customerId: string;
  benefitType: BenefitType;
  enabled: boolean;
}

/**
 * Fetch all benefits for a specific customer
 */
export function useCustomerBenefits(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-benefits', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('customer_benefits')
        .select('*')
        .eq('customer_id', customerId);

      if (error) throw error;
      return (data || []) as CustomerBenefit[];
    },
    enabled: !!customerId,
  });
}

/**
 * Fetch benefits for multiple customers (for Operations Hub)
 */
export function useCustomersBenefits(customerIds: string[]) {
  return useQuery({
    queryKey: ['customers-benefits', customerIds],
    queryFn: async () => {
      if (!customerIds.length) return {};

      const { data, error } = await supabase
        .from('customer_benefits')
        .select('*')
        .in('customer_id', customerIds)
        .eq('enabled', true);

      if (error) throw error;

      // Group by customer_id
      const benefitsByCustomer: Record<string, CustomerBenefit[]> = {};
      for (const benefit of data || []) {
        if (!benefitsByCustomer[benefit.customer_id]) {
          benefitsByCustomer[benefit.customer_id] = [];
        }
        benefitsByCustomer[benefit.customer_id].push(benefit as CustomerBenefit);
      }

      return benefitsByCustomer;
    },
    enabled: customerIds.length > 0,
  });
}

/**
 * Mutations for benefit management
 */
export function useBenefitMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleBenefit = useMutation({
    mutationFn: async ({ customerId, benefitType, enabled }: ToggleBenefitParams) => {
      const { data, error } = await supabase.rpc('toggle_customer_benefit', {
        p_customer_id: customerId,
        p_benefit_type: benefitType,
        p_enabled: enabled,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to toggle benefit');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-benefits', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers-benefits'] });
      
      const benefitLabel = getBenefitLabel(variables.benefitType);
      toast({
        title: variables.enabled ? 'Benefit Enabled' : 'Benefit Disabled',
        description: `${benefitLabel} has been ${variables.enabled ? 'enabled' : 'disabled'} for this customer.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Update Benefit',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const enableBenefit = (customerId: string, benefitType: BenefitType) => {
    return toggleBenefit.mutateAsync({ customerId, benefitType, enabled: true });
  };

  const disableBenefit = (customerId: string, benefitType: BenefitType) => {
    return toggleBenefit.mutateAsync({ customerId, benefitType, enabled: false });
  };

  return {
    toggleBenefit,
    enableBenefit,
    disableBenefit,
    isLoading: toggleBenefit.isPending,
  };
}
