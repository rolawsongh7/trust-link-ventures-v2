// Standing Orders Hook
// Phase 5.3: Subscriptions & Recurring Orders

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types
export type StandingOrderFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
export type StandingOrderStatus = 'active' | 'paused' | 'cancelled';

export interface StandingOrder {
  id: string;
  customer_id: string;
  name: string;
  description: string | null;
  frequency: StandingOrderFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  next_scheduled_date: string;
  last_generated_date: string | null;
  status: StandingOrderStatus;
  paused_at: string | null;
  paused_reason: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  requires_approval: boolean;
  auto_use_credit: boolean;
  total_orders_generated: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface StandingOrderItem {
  id: string;
  standing_order_id: string;
  product_id: string | null;
  product_name: string;
  product_description: string | null;
  quantity: number;
  unit: string;
  unit_price: number | null;
  grade: string | null;
  specifications: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StandingOrderGeneration {
  id: string;
  standing_order_id: string;
  order_id: string | null;
  quote_id: string | null;
  scheduled_date: string;
  generated_at: string;
  generation_type: 'scheduled' | 'manual' | 'retry';
  status: 'success' | 'failed' | 'skipped';
  failure_reason: string | null;
  skipped_reason: string | null;
  estimated_amount: number | null;
  created_at: string;
}

export interface CreateStandingOrderInput {
  customer_id: string;
  name: string;
  description?: string;
  frequency: StandingOrderFrequency;
  day_of_week?: number;
  day_of_month?: number;
  requires_approval?: boolean;
  auto_use_credit?: boolean;
  items: Omit<StandingOrderItem, 'id' | 'standing_order_id' | 'created_at' | 'updated_at'>[];
}

/**
 * Fetch all standing orders (admin view)
 */
export function useStandingOrders(filters?: { 
  customerId?: string; 
  status?: StandingOrderStatus[];
}) {
  return useQuery({
    queryKey: ['standing-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('standing_orders')
        .select(`
          *,
          customers:customer_id (
            id,
            company_name,
            contact_name
          )
        `)
        .order('next_scheduled_date', { ascending: true });

      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }

      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (StandingOrder & { 
        customers: { id: string; company_name: string; contact_name: string | null } 
      })[];
    },
  });
}

/**
 * Fetch a single standing order with items
 */
export function useStandingOrder(standingOrderId: string | undefined) {
  return useQuery({
    queryKey: ['standing-order', standingOrderId],
    queryFn: async () => {
      if (!standingOrderId) return null;

      const [orderResult, itemsResult] = await Promise.all([
        supabase
          .from('standing_orders')
          .select(`
            *,
            customers:customer_id (
              id,
              company_name,
              contact_name,
              email
            )
          `)
          .eq('id', standingOrderId)
          .single(),
        supabase
          .from('standing_order_items')
          .select('*')
          .eq('standing_order_id', standingOrderId)
          .order('created_at', { ascending: true }),
      ]);

      if (orderResult.error) throw orderResult.error;
      if (itemsResult.error) throw itemsResult.error;

      return {
        ...orderResult.data,
        items: itemsResult.data as StandingOrderItem[],
      };
    },
    enabled: !!standingOrderId,
  });
}

/**
 * Fetch standing order generation history
 */
export function useStandingOrderGenerations(standingOrderId: string | undefined) {
  return useQuery({
    queryKey: ['standing-order-generations', standingOrderId],
    queryFn: async () => {
      if (!standingOrderId) return [];

      const { data, error } = await supabase
        .from('standing_order_generations')
        .select(`
          *,
          quotes:quote_id (
            id,
            quote_number,
            status,
            total_amount
          )
        `)
        .eq('standing_order_id', standingOrderId)
        .order('generated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!standingOrderId,
  });
}

/**
 * Customer's standing orders
 */
export function useCustomerStandingOrders(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-standing-orders', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('standing_orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StandingOrder[];
    },
    enabled: !!customerId,
  });
}

/**
 * Standing order mutations
 */
export function useStandingOrderMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createStandingOrder = useMutation({
    mutationFn: async (input: CreateStandingOrderInput) => {
      // Calculate next scheduled date
      const { data: nextDate } = await supabase.rpc('calculate_next_schedule_date', {
        p_frequency: input.frequency,
        p_day_of_week: input.day_of_week ?? null,
        p_day_of_month: input.day_of_month ?? null,
        p_from_date: new Date().toISOString().split('T')[0],
      });

      // Create standing order
      const { data: order, error: orderError } = await supabase
        .from('standing_orders')
        .insert({
          customer_id: input.customer_id,
          name: input.name,
          description: input.description,
          frequency: input.frequency,
          day_of_week: input.day_of_week,
          day_of_month: input.day_of_month,
          next_scheduled_date: nextDate || new Date().toISOString().split('T')[0],
          requires_approval: input.requires_approval ?? true,
          auto_use_credit: input.auto_use_credit ?? false,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Add items
      if (input.items.length > 0) {
        const itemsToInsert = input.items.map(item => ({
          ...item,
          standing_order_id: order.id,
        }));

        const { error: itemsError } = await supabase
          .from('standing_order_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      return order as StandingOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standing-orders'] });
      queryClient.invalidateQueries({ queryKey: ['customer-standing-orders'] });
      toast({ title: 'Standing order created successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create standing order',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateStandingOrderStatus = useMutation({
    mutationFn: async ({ 
      standingOrderId, 
      status, 
      reason 
    }: { 
      standingOrderId: string; 
      status: StandingOrderStatus; 
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc('update_standing_order_status', {
        p_standing_order_id: standingOrderId,
        p_status: status,
        p_reason: reason ?? null,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to update status');
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['standing-orders'] });
      queryClient.invalidateQueries({ queryKey: ['standing-order', variables.standingOrderId] });
      queryClient.invalidateQueries({ queryKey: ['customer-standing-orders'] });
      
      const statusLabel = variables.status === 'active' 
        ? 'resumed' 
        : variables.status === 'paused' 
          ? 'paused' 
          : 'cancelled';
      
      toast({ title: `Standing order ${statusLabel}` });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update standing order',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const generateOrderNow = useMutation({
    mutationFn: async (standingOrderId: string) => {
      const { data, error } = await supabase.rpc('generate_order_from_standing_order', {
        p_standing_order_id: standingOrderId,
        p_generation_type: 'manual',
      });

      if (error) throw error;

      const result = data as { 
        success: boolean; 
        error?: string;
        quote_id?: string;
        quote_number?: string;
        estimated_amount?: number;
      };

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate order');
      }

      return result;
    },
    onSuccess: (result, standingOrderId) => {
      queryClient.invalidateQueries({ queryKey: ['standing-orders'] });
      queryClient.invalidateQueries({ queryKey: ['standing-order', standingOrderId] });
      queryClient.invalidateQueries({ queryKey: ['standing-order-generations', standingOrderId] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      
      toast({ 
        title: 'Quote generated', 
        description: `Quote ${result.quote_number} created for review` 
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to generate order',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateStandingOrderItems = useMutation({
    mutationFn: async ({ 
      standingOrderId, 
      items 
    }: { 
      standingOrderId: string; 
      items: Omit<StandingOrderItem, 'id' | 'standing_order_id' | 'created_at' | 'updated_at'>[];
    }) => {
      // Delete existing items
      await supabase
        .from('standing_order_items')
        .delete()
        .eq('standing_order_id', standingOrderId);

      // Insert new items
      if (items.length > 0) {
        const itemsToInsert = items.map(item => ({
          ...item,
          standing_order_id: standingOrderId,
        }));

        const { error } = await supabase
          .from('standing_order_items')
          .insert(itemsToInsert);

        if (error) throw error;
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['standing-order', variables.standingOrderId] });
      toast({ title: 'Standing order items updated' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update items',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    createStandingOrder,
    updateStandingOrderStatus,
    generateOrderNow,
    updateStandingOrderItems,
  };
}

/**
 * Get frequency display label
 */
export function getFrequencyLabel(frequency: StandingOrderFrequency): string {
  const labels: Record<StandingOrderFrequency, string> = {
    weekly: 'Weekly',
    biweekly: 'Every 2 Weeks',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
  };
  return labels[frequency];
}

/**
 * Get day of week label
 */
export function getDayOfWeekLabel(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] || 'Unknown';
}

/**
 * Get status badge color
 */
export function getStandingOrderStatusColor(status: StandingOrderStatus): string {
  const colors: Record<StandingOrderStatus, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    paused: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[status];
}
