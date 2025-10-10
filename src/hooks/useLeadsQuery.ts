import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ErrorRecovery } from '@/lib/errorRecovery';

export interface Lead {
  id: string;
  title: string;
  description?: string;
  status: string;
  source?: string;
  lead_score?: number;
  value?: number;
  currency?: string;
  customer_id?: string;
  assigned_to?: string;
  created_at?: string;
  customers?: {
    id: string;
    company_name: string;
    email: string;
  };
}

export const useLeadsQuery = (customerId?: string) => {
  const queryClient = useQueryClient();

  // Fetch leads with optional customer filter
  const leadsQuery = useQuery({
    queryKey: ['leads', customerId],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select(`
          *,
          customers (
            id,
            company_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Lead[];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return ErrorRecovery.withRetry(async () => {
        const { data, error } = await supabase
          .from('leads')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['leads', customerId] });
      const previousLeads = queryClient.getQueryData<Lead[]>(['leads', customerId]);

      queryClient.setQueryData<Lead[]>(['leads', customerId], (old) =>
        old?.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead))
      );

      return { previousLeads };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['leads', customerId], context?.previousLeads);
      toast.error('Failed to update lead');
    },
    onSuccess: () => {
      toast.success('Lead updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', customerId] });
    },
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (newLead: any) => {
      return ErrorRecovery.withRetry(async () => {
        const { data, error } = await supabase
          .from('leads')
          .insert([newLead])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully');
    },
    onError: () => {
      toast.error('Failed to create lead');
    },
  });

  // Delete lead mutation
  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      return ErrorRecovery.withRetry(async () => {
        const { error } = await supabase.from('leads').delete().eq('id', id);
        if (error) throw error;
      });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['leads', customerId] });
      const previousLeads = queryClient.getQueryData<Lead[]>(['leads', customerId]);

      queryClient.setQueryData<Lead[]>(['leads', customerId], (old) =>
        old?.filter((lead) => lead.id !== id)
      );

      return { previousLeads };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['leads', customerId], context?.previousLeads);
      toast.error('Failed to delete lead');
    },
    onSuccess: () => {
      toast.success('Lead deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', customerId] });
    },
  });

  return {
    leads: leadsQuery.data ?? [],
    loading: leadsQuery.isLoading,
    error: leadsQuery.error,
    updateLead: updateLeadMutation.mutate,
    createLead: createLeadMutation.mutate,
    deleteLead: deleteLeadMutation.mutate,
    isUpdating: updateLeadMutation.isPending,
    isCreating: createLeadMutation.isPending,
    isDeleting: deleteLeadMutation.isPending,
  };
};
