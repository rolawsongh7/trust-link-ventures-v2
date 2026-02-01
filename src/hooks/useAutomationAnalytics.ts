/**
 * Phase 4.4: Automation Analytics Hooks
 * React Query hooks for automation analytics data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AutomationAnalyticsService,
  type HealthOverview,
  type HealthStatus,
  type RulePerformance,
  type RuleDetails,
  type CustomerImpactMetrics,
  type StaffTrustMetrics,
  type RuleFilter,
} from '@/services/automationAnalyticsService';
import {
  AutomationTrustService,
  type TrustEvaluation,
} from '@/services/automationTrustService';
import { toast } from 'sonner';

// ============================================
// Query Keys
// ============================================

export const automationAnalyticsKeys = {
  all: ['automation-analytics'] as const,
  healthOverview: (days: number) => [...automationAnalyticsKeys.all, 'health', days] as const,
  rulePerformance: (days: number, filter: RuleFilter) => 
    [...automationAnalyticsKeys.all, 'rules', days, filter] as const,
  ruleDetails: (ruleId: string, days: number) => 
    [...automationAnalyticsKeys.all, 'rule', ruleId, days] as const,
  customerImpact: (days: number) => [...automationAnalyticsKeys.all, 'customer', days] as const,
  staffTrust: (days: number) => [...automationAnalyticsKeys.all, 'trust', days] as const,
  realTime: () => [...automationAnalyticsKeys.all, 'realtime'] as const,
  ruleTrust: (ruleId: string) => [...automationAnalyticsKeys.all, 'rule-trust', ruleId] as const,
};

// ============================================
// Hooks
// ============================================

/**
 * Hook for health overview KPIs
 */
export function useHealthOverview(days: number = 7) {
  return useQuery<HealthOverview>({
    queryKey: automationAnalyticsKeys.healthOverview(days),
    queryFn: () => AutomationAnalyticsService.getHealthOverview(days),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });
}

/**
 * Hook for rule performance table
 */
export function useRulePerformance(days: number = 30, filter: RuleFilter = 'all') {
  return useQuery<RulePerformance[]>({
    queryKey: automationAnalyticsKeys.rulePerformance(days, filter),
    queryFn: () => AutomationAnalyticsService.getRulePerformance(days, filter),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook for single rule details
 */
export function useRuleDetails(ruleId: string | null, days: number = 30) {
  return useQuery<RuleDetails | null>({
    queryKey: automationAnalyticsKeys.ruleDetails(ruleId || '', days),
    queryFn: () => ruleId ? AutomationAnalyticsService.getRuleDetails(ruleId, days) : null,
    enabled: !!ruleId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook for customer impact metrics
 */
export function useCustomerImpact(days: number = 7) {
  return useQuery<CustomerImpactMetrics>({
    queryKey: automationAnalyticsKeys.customerImpact(days),
    queryFn: () => AutomationAnalyticsService.getCustomerImpactMetrics(days),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook for staff trust metrics
 */
export function useStaffTrust(days: number = 30) {
  return useQuery<StaffTrustMetrics>({
    queryKey: automationAnalyticsKeys.staffTrust(days),
    queryFn: () => AutomationAnalyticsService.getStaffTrustMetrics(days),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook for real-time metrics
 */
export function useRealTimeMetrics() {
  return useQuery({
    queryKey: automationAnalyticsKeys.realTime(),
    queryFn: () => AutomationAnalyticsService.getRealTimeMetrics(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refresh every minute
  });
}

/**
 * Hook for rule trust status
 */
export function useRuleTrustStatus(ruleId: string | null) {
  return useQuery({
    queryKey: automationAnalyticsKeys.ruleTrust(ruleId || ''),
    queryFn: () => ruleId ? AutomationTrustService.getRuleTrustStatus(ruleId) : null,
    enabled: !!ruleId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook for submitting feedback
 */
export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      executionId,
      feedbackType,
      notes,
    }: {
      executionId: string;
      feedbackType: 'helpful' | 'neutral' | 'harmful';
      notes?: string;
    }) => {
      await AutomationAnalyticsService.submitFeedback(executionId, feedbackType, notes);
    },
    onSuccess: () => {
      toast.success('Feedback submitted', {
        description: 'Thank you for your input. This helps improve automation quality.',
      });
      // Invalidate staff trust metrics
      queryClient.invalidateQueries({ queryKey: automationAnalyticsKeys.all });
    },
    onError: (error) => {
      console.error('[useSubmitFeedback] Error:', error);
      toast.error('Failed to submit feedback', {
        description: 'Please try again.',
      });
    },
  });
}

/**
 * Hook for re-enabling an auto-disabled rule
 */
export function useReenableRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      await AutomationTrustService.reenableRule(ruleId);
    },
    onSuccess: () => {
      toast.success('Rule re-enabled', {
        description: 'The automation rule has been re-enabled. Monitor its performance.',
      });
      queryClient.invalidateQueries({ queryKey: automationAnalyticsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    },
    onError: (error) => {
      console.error('[useReenableRule] Error:', error);
      toast.error('Failed to re-enable rule', {
        description: 'Please try again.',
      });
    },
  });
}

// ============================================
// Types re-export
// ============================================

export type {
  HealthOverview,
  HealthStatus,
  RulePerformance,
  RuleDetails,
  CustomerImpactMetrics,
  StaffTrustMetrics,
  RuleFilter,
  TrustEvaluation,
};
