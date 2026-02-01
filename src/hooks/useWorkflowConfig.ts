// Workflow Configuration Hook
// Phase 5.4: Provides tenant-specific workflow configuration

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './useTenant';
import { useRoleAuth } from './useRoleAuth';
import { useToast } from './use-toast';

export interface WorkflowConfig {
  quotes_enabled: boolean;
  credit_terms_enabled: boolean;
  loyalty_program_enabled: boolean;
  payment_proofs_required: boolean;
  auto_invoice_generation: boolean;
  require_delivery_confirmation: boolean;
  allow_partial_payments: boolean;
  enable_standing_orders: boolean;
  max_credit_limit: number;
  default_net_terms: string;
}

export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  quotes_enabled: true,
  credit_terms_enabled: true,
  loyalty_program_enabled: true,
  payment_proofs_required: true,
  auto_invoice_generation: true,
  require_delivery_confirmation: true,
  allow_partial_payments: false,
  enable_standing_orders: true,
  max_credit_limit: 50000,
  default_net_terms: 'net_14',
};

/**
 * Get workflow configuration for the current tenant
 */
export function useWorkflowConfig() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenant?.id;

  return useQuery({
    queryKey: ['workflow-config', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        return DEFAULT_WORKFLOW_CONFIG;
      }

      // Use raw RPC call since types may not be generated yet
      const { data, error } = await (supabase as any).rpc('get_tenant_workflow_config', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      return { ...DEFAULT_WORKFLOW_CONFIG, ...(data || {}) } as WorkflowConfig;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Get workflow configuration for a specific tenant (super admin)
 */
export function useTenantWorkflowConfig(tenantId: string | null) {
  const { hasSuperAdminAccess } = useRoleAuth();

  return useQuery({
    queryKey: ['workflow-config', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await (supabase as any).rpc('get_tenant_workflow_config', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      return { ...DEFAULT_WORKFLOW_CONFIG, ...(data || {}) } as WorkflowConfig;
    },
    enabled: hasSuperAdminAccess && !!tenantId,
  });
}

/**
 * Update workflow configuration (super admin only)
 */
export function useUpdateWorkflowConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      tenantId,
      config,
    }: {
      tenantId: string;
      config: Partial<WorkflowConfig>;
    }) => {
      const { data, error } = await (supabase as any).rpc('update_tenant_workflow_config', {
        p_tenant_id: tenantId,
        p_config: config,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to update workflow configuration');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-config', variables.tenantId] });
      toast({
        title: 'Configuration Updated',
        description: 'Workflow configuration has been saved successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Get all tenant workflow configs (super admin dashboard)
 */
export function useAllWorkflowConfigs() {
  const { hasSuperAdminAccess } = useRoleAuth();

  return useQuery({
    queryKey: ['workflow-configs', 'all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tenant_workflow_config')
        .select(`
          id,
          tenant_id,
          config,
          created_at,
          updated_at,
          tenant:tenants (
            id,
            name,
            slug,
            status
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: hasSuperAdminAccess,
  });
}
