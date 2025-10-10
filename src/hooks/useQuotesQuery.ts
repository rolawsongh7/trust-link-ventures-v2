import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ErrorRecovery } from '@/lib/errorRecovery';

export interface Quote {
  id: string;
  quote_number: string;
  status: string;
  total_amount: number;
  currency?: string;
  customer_id?: string;
  customer_email?: string;
  title?: string;
  description?: string;
  valid_until?: string;
  created_at?: string;
  customers?: {
    id: string;
    company_name: string;
    email: string;
  };
}

export const useQuotesQuery = (customerId?: string) => {
  const queryClient = useQueryClient();

  // Fetch quotes with optional customer filter
  const quotesQuery = useQuery({
    queryKey: ['quotes', customerId],
    queryFn: async () => {
      let query = supabase
        .from('quotes')
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
      return data as Quote[];
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update quote mutation
  const updateQuoteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Quote> }) => {
      return ErrorRecovery.withRetry(async () => {
        const { data, error } = await supabase
          .from('quotes')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['quotes', customerId] });
      const previousQuotes = queryClient.getQueryData<Quote[]>(['quotes', customerId]);

      queryClient.setQueryData<Quote[]>(['quotes', customerId], (old) =>
        old?.map((quote) => (quote.id === id ? { ...quote, ...updates } : quote))
      );

      return { previousQuotes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['quotes', customerId], context?.previousQuotes);
      toast.error('Failed to update quote');
    },
    onSuccess: () => {
      toast.success('Quote updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', customerId] });
    },
  });

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: async (newQuote: any) => {
      return ErrorRecovery.withRetry(async () => {
        const { data, error } = await supabase
          .from('quotes')
          .insert([newQuote])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote created successfully');
    },
    onError: () => {
      toast.error('Failed to create quote');
    },
  });

  // Delete quote mutation
  const deleteQuoteMutation = useMutation({
    mutationFn: async (id: string) => {
      return ErrorRecovery.withRetry(async () => {
        const { error } = await supabase.from('quotes').delete().eq('id', id);
        if (error) throw error;
      });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['quotes', customerId] });
      const previousQuotes = queryClient.getQueryData<Quote[]>(['quotes', customerId]);

      queryClient.setQueryData<Quote[]>(['quotes', customerId], (old) =>
        old?.filter((quote) => quote.id !== id)
      );

      return { previousQuotes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['quotes', customerId], context?.previousQuotes);
      toast.error('Failed to delete quote');
    },
    onSuccess: () => {
      toast.success('Quote deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', customerId] });
    },
  });

  // Prefetch quote details
  const prefetchQuoteDetails = (quoteId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['quote', quoteId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('quotes')
          .select('*')
          .eq('id', quoteId)
          .single();

        if (error) throw error;
        return data;
      },
    });
  };

  return {
    quotes: quotesQuery.data ?? [],
    loading: quotesQuery.isLoading,
    error: quotesQuery.error,
    updateQuote: updateQuoteMutation.mutate,
    createQuote: createQuoteMutation.mutate,
    deleteQuote: deleteQuoteMutation.mutate,
    isUpdating: updateQuoteMutation.isPending,
    isCreating: createQuoteMutation.isPending,
    isDeleting: deleteQuoteMutation.isPending,
    prefetchQuoteDetails,
  };
};
