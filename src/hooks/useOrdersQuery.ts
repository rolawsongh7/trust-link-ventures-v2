import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderUpdate = Database['public']['Tables']['orders']['Update'];

export const useOrdersQuery = (customerId?: string) => {
  const queryClient = useQueryClient();

  // Main orders query with caching
  const ordersQuery = useQuery({
    queryKey: ['orders', customerId],
    queryFn: async (): Promise<Order[]> => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          quotes(quote_number, title),
          customers(company_name, contact_name, email),
          customer_addresses(street_address, city, region, ghana_digital_address)
        `)
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch order items in parallel for each order
      const ordersWithItems = await Promise.all(
        (data || []).map(async (order) => {
          const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);

          if (itemsError) {
            console.error('Error fetching order items:', itemsError);
            return { ...order, order_items: [] };
          }

          return { ...order, order_items: items || [] };
        })
      );

      return ordersWithItems;
    },
    staleTime: 30000, // 30 seconds - data is fresh for 30s
    gcTime: 300000, // 5 minutes - keep in cache for 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Update order mutation with optimistic updates
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string; updates: OrderUpdate }) => {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ orderId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['orders', customerId] });

      // Snapshot previous value
      const previousOrders = queryClient.getQueryData<Order[]>(['orders', customerId]);

      // Optimistically update to the new value
      queryClient.setQueryData<Order[]>(['orders', customerId], (old) => {
        return old?.map((order) =>
          order.id === orderId ? { ...order, ...updates } : order
        );
      });

      return { previousOrders };
    },
    onError: (error: any, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousOrders) {
        queryClient.setQueryData(['orders', customerId], context.previousOrders);
      }
      console.error('Update order error:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update order',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: 'Order Updated',
        description: 'Order has been updated successfully',
      });
    },
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (newOrder: OrderInsert) => {
      const { data, error } = await supabase
        .from('orders')
        .insert(newOrder)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: 'Order Created',
        description: 'New order has been created successfully',
      });
    },
    onError: (error: any) => {
      console.error('Create order error:', error);
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create order',
        variant: 'destructive',
      });
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
    },
    onMutate: async (orderId) => {
      await queryClient.cancelQueries({ queryKey: ['orders', customerId] });
      const previousOrders = queryClient.getQueryData<Order[]>(['orders', customerId]);

      queryClient.setQueryData<Order[]>(['orders', customerId], (old) => {
        return old?.filter((order) => order.id !== orderId);
      });

      return { previousOrders };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(['orders', customerId], context.previousOrders);
      }
      console.error('Delete order error:', error);
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Failed to delete order',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: 'Order Deleted',
        description: 'Order has been deleted successfully',
      });
    },
  });

  // Prefetch order details (for hover states)
  const prefetchOrderDetails = async (orderId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['order', orderId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            quotes(*),
            customers(*),
            customer_addresses(*),
            order_items(*)
          `)
          .eq('id', orderId)
          .single();

        if (error) throw error;
        return data;
      },
      staleTime: 60000, // 1 minute
    });
  };

  return {
    orders: ordersQuery.data || [],
    isLoading: ordersQuery.isLoading,
    isError: ordersQuery.isError,
    error: ordersQuery.error,
    refetch: ordersQuery.refetch,
    updateOrder: updateOrderMutation.mutate,
    createOrder: createOrderMutation.mutate,
    deleteOrder: deleteOrderMutation.mutate,
    isUpdating: updateOrderMutation.isPending,
    isCreating: createOrderMutation.isPending,
    isDeleting: deleteOrderMutation.isPending,
    prefetchOrderDetails,
  };
};
