/**
 * Phase 4.1: Automation Foundations
 * React hooks for automation management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  AutomationSettings, 
  AutomationRule, 
  AutomationExecution,
  ExecutionStatus
} from '@/utils/automationHelpers';

// ============================================
// Query Keys
// ============================================

const AUTOMATION_KEYS = {
  settings: ['automation', 'settings'] as const,
  rules: ['automation', 'rules'] as const,
  rule: (id: string) => ['automation', 'rule', id] as const,
  executions: (ruleId?: string) => 
    ruleId 
      ? ['automation', 'executions', ruleId] as const
      : ['automation', 'executions'] as const,
  enabled: ['automation', 'enabled'] as const,
};

// ============================================
// Settings Hook
// ============================================

export function useAutomationSettings() {
  return useQuery({
    queryKey: AUTOMATION_KEYS.settings,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as AutomationSettings;
    },
  });
}

// ============================================
// Rules Hook
// ============================================

export function useAutomationRules() {
  return useQuery({
    queryKey: AUTOMATION_KEYS.rules,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .order('priority', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Map database types to our internal types
      return (data || []).map(rule => ({
        ...rule,
        entity_type: rule.entity_type as AutomationRule['entity_type'],
        trigger_event: rule.trigger_event as AutomationRule['trigger_event'],
        conditions: rule.conditions as Record<string, unknown>,
        actions: (Array.isArray(rule.actions) ? rule.actions : []) as unknown as AutomationRule['actions'],
      })) as AutomationRule[];
    },
  });
}

// ============================================
// Single Rule Hook
// ============================================

export function useAutomationRule(ruleId: string | null) {
  return useQuery({
    queryKey: ruleId ? AUTOMATION_KEYS.rule(ruleId) : ['automation', 'rule', 'none'],
    queryFn: async () => {
      if (!ruleId) return null;
      
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        entity_type: data.entity_type as AutomationRule['entity_type'],
        trigger_event: data.trigger_event as AutomationRule['trigger_event'],
        conditions: data.conditions as Record<string, unknown>,
        actions: (Array.isArray(data.actions) ? data.actions : []) as unknown as AutomationRule['actions'],
      } as AutomationRule;
    },
    enabled: !!ruleId,
  });
}

// ============================================
// Executions Hook
// ============================================

interface UseAutomationExecutionsOptions {
  ruleId?: string;
  limit?: number;
  status?: ExecutionStatus;
}

export function useAutomationExecutions(options: UseAutomationExecutionsOptions = {}) {
  const { ruleId, limit = 50, status } = options;

  return useQuery({
    queryKey: [...AUTOMATION_KEYS.executions(ruleId), { limit, status }],
    queryFn: async () => {
      let query = supabase
        .from('automation_executions')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(limit);

      if (ruleId) {
        query = query.eq('rule_id', ruleId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Map database types to our internal types
      return (data || []).map(exec => ({
        ...exec,
        status: exec.status as ExecutionStatus,
        result: exec.result as Record<string, unknown> | null,
      })) as AutomationExecution[];
    },
  });
}

// ============================================
// Is Enabled Hook
// ============================================

export function useIsAutomationEnabled() {
  return useQuery({
    queryKey: AUTOMATION_KEYS.enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_automation_enabled');
      if (error) throw error;
      return data as boolean;
    },
  });
}

// ============================================
// Mutations Hook
// ============================================

export function useAutomationMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleGlobalMutation = useMutation({
    mutationFn: async ({ enabled, reason }: { enabled: boolean; reason?: string }) => {
      const { data, error } = await supabase.rpc('toggle_automation_global', {
        p_enabled: enabled,
        p_reason: reason || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; enabled?: boolean };
      if (!result.success) {
        throw new Error(result.error || 'Failed to toggle automation');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AUTOMATION_KEYS.settings });
      queryClient.invalidateQueries({ queryKey: AUTOMATION_KEYS.enabled });
      
      toast({
        title: variables.enabled ? 'Automation Enabled' : 'Automation Disabled',
        description: variables.enabled 
          ? 'Global automation is now active. Rules will execute on triggers.'
          : 'Global automation is now disabled. No rules will execute.',
        variant: variables.enabled ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, enabled }: { ruleId: string; enabled: boolean }) => {
      const { data, error } = await supabase.rpc('toggle_automation_rule', {
        p_rule_id: ruleId,
        p_enabled: enabled,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to toggle rule');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AUTOMATION_KEYS.rules });
      
      toast({
        title: variables.enabled ? 'Rule Enabled' : 'Rule Disabled',
        description: variables.enabled 
          ? 'This rule will now execute on its trigger event.'
          : 'This rule will no longer execute.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetFailureCountMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { data, error } = await supabase.rpc('reset_rule_failure_count', {
        p_rule_id: ruleId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to reset failure count');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTOMATION_KEYS.rules });
      
      toast({
        title: 'Failure Count Reset',
        description: 'The rule failure count has been reset. You can now re-enable it.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    toggleGlobal: toggleGlobalMutation.mutate,
    toggleRule: toggleRuleMutation.mutate,
    resetFailureCount: resetFailureCountMutation.mutate,
    isToggling: toggleGlobalMutation.isPending || toggleRuleMutation.isPending,
    isResetting: resetFailureCountMutation.isPending,
  };
}

// ============================================
// Combined Hook for Convenience
// ============================================

export function useAutomation() {
  const settings = useAutomationSettings();
  const rules = useAutomationRules();
  const executions = useAutomationExecutions();
  const isEnabled = useIsAutomationEnabled();
  const mutations = useAutomationMutations();

  return {
    settings: settings.data,
    rules: rules.data,
    executions: executions.data,
    isEnabled: isEnabled.data ?? false,
    isLoading: settings.isLoading || rules.isLoading || isEnabled.isLoading,
    ...mutations,
    refetch: () => {
      settings.refetch();
      rules.refetch();
      executions.refetch();
      isEnabled.refetch();
    },
  };
}
