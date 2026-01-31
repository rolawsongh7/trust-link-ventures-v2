/**
 * Phase 3A: Subscription Management Hook
 * 
 * Manages tenant subscription state. Super admin only for mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type SubscriptionPlan = 'starter' | 'growth' | 'enterprise';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled';
export type BillingCycle = 'monthly' | 'yearly';

export interface Subscription {
  id: string;
  tenant_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateSubscriptionInput {
  plan?: SubscriptionPlan;
  status?: SubscriptionStatus;
  billing_cycle?: BillingCycle;
  ends_at?: string | null;
}

async function logSubscriptionEvent(
  eventType: string,
  subscriptionId: string,
  changes: Record<string, unknown>
) {
  await supabase.from('audit_logs').insert([{
    event_type: eventType,
    resource_type: 'subscription',
    resource_id: subscriptionId,
    action: 'update',
    event_data: changes as unknown as Record<string, never>,
    severity: 'medium',
  }]);
}

export function useSubscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current subscription (first one found - tenant model)
  const {
    data: subscription,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['subscription'],
    queryFn: async (): Promise<Subscription | null> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Subscription | null;
    },
    enabled: !!user,
  });

  // Update subscription (super_admin only via RLS)
  const updateMutation = useMutation({
    mutationFn: async ({
      subscriptionId,
      updates,
    }: {
      subscriptionId: string;
      updates: UpdateSubscriptionInput;
    }) => {
      const { data: oldData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw error;

      // Log the change
      await logSubscriptionEvent('subscription_updated', subscriptionId, {
        old_values: oldData,
        new_values: updates,
        changed_by: user?.id,
      });

      return data as Subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast({ title: 'Subscription updated successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update subscription',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create subscription (for initial setup)
  const createMutation = useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      plan: SubscriptionPlan;
      billing_cycle?: BillingCycle;
    }) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          tenant_id: input.tenant_id,
          plan: input.plan,
          billing_cycle: input.billing_cycle || 'monthly',
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      // Log the creation
      await logSubscriptionEvent('subscription_created', data.id, {
        plan: input.plan,
        billing_cycle: input.billing_cycle || 'monthly',
        created_by: user?.id,
      });

      return data as Subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast({ title: 'Subscription created successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create subscription',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Cancel subscription
  const cancelMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          ends_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw error;

      await logSubscriptionEvent('subscription_canceled', subscriptionId, {
        canceled_by: user?.id,
        canceled_at: new Date().toISOString(),
      });

      return data as Subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast({ title: 'Subscription canceled' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to cancel subscription',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reactivate subscription
  const reactivateMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          ends_at: null,
        })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw error;

      await logSubscriptionEvent('subscription_reactivated', subscriptionId, {
        reactivated_by: user?.id,
        reactivated_at: new Date().toISOString(),
      });

      return data as Subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast({ title: 'Subscription reactivated' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to reactivate subscription',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    subscription,
    isLoading,
    error,
    refetch,
    updatePlan: (subscriptionId: string, plan: SubscriptionPlan) =>
      updateMutation.mutateAsync({ subscriptionId, updates: { plan } }),
    updateSubscription: (subscriptionId: string, updates: UpdateSubscriptionInput) =>
      updateMutation.mutateAsync({ subscriptionId, updates }),
    createSubscription: createMutation.mutateAsync,
    cancelSubscription: cancelMutation.mutateAsync,
    reactivateSubscription: reactivateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    isCreating: createMutation.isPending,
    isCanceling: cancelMutation.isPending,
    isReactivating: reactivateMutation.isPending,
  };
}

/**
 * Get plan display name
 */
export function getPlanDisplayName(plan: SubscriptionPlan): string {
  const names: Record<SubscriptionPlan, string> = {
    starter: 'Starter',
    growth: 'Growth',
    enterprise: 'Enterprise',
  };
  return names[plan];
}

/**
 * Get status badge color
 */
export function getStatusColor(status: SubscriptionStatus): string {
  const colors: Record<SubscriptionStatus, string> = {
    active: 'bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400',
    past_due: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400',
    canceled: 'bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400',
  };
  return colors[status];
}
