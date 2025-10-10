import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ErrorRecovery } from '@/lib/errorRecovery';

export interface Customer {
  id: string;
  company_name: string;
  contact_name?: string;
  email: string;
  phone?: string;
  country?: string;
  industry?: string;
  customer_status?: string;
  priority?: string;
  notes?: string;
  created_at?: string;
}

export const useCustomersQuery = (filters?: { status?: string; industry?: string; country?: string }) => {
  const queryClient = useQueryClient();

  // Fetch customers with optional filters
  const customersQuery = useQuery({
    queryKey: ['customers', filters],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('customer_status', filters.status);
      }
      if (filters?.industry) {
        query = query.eq('industry', filters.industry);
      }
      if (filters?.country) {
        query = query.eq('country', filters.country);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Customer[];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Customer> }) => {
      return ErrorRecovery.withRetry(async () => {
        const { data, error } = await supabase
          .from('customers')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['customers', filters] });
      const previousCustomers = queryClient.getQueryData<Customer[]>(['customers', filters]);

      queryClient.setQueryData<Customer[]>(['customers', filters], (old) =>
        old?.map((customer) => (customer.id === id ? { ...customer, ...updates } : customer))
      );

      return { previousCustomers };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['customers', filters], context?.previousCustomers);
      toast.error('Failed to update customer');
    },
    onSuccess: () => {
      toast.success('Customer updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (newCustomer: any) => {
      return ErrorRecovery.withRetry(async () => {
        const { data, error } = await supabase
          .from('customers')
          .insert([newCustomer])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully');
    },
    onError: () => {
      toast.error('Failed to create customer');
    },
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      return ErrorRecovery.withRetry(async () => {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
      });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['customers', filters] });
      const previousCustomers = queryClient.getQueryData<Customer[]>(['customers', filters]);

      queryClient.setQueryData<Customer[]>(['customers', filters], (old) =>
        old?.filter((customer) => customer.id !== id)
      );

      return { previousCustomers };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['customers', filters], context?.previousCustomers);
      toast.error('Failed to delete customer');
    },
    onSuccess: () => {
      toast.success('Customer deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  return {
    customers: customersQuery.data ?? [],
    loading: customersQuery.isLoading,
    error: customersQuery.error,
    updateCustomer: updateCustomerMutation.mutate,
    createCustomer: createCustomerMutation.mutate,
    deleteCustomer: deleteCustomerMutation.mutate,
    isUpdating: updateCustomerMutation.isPending,
    isCreating: createCustomerMutation.isPending,
    isDeleting: deleteCustomerMutation.isPending,
  };
};
