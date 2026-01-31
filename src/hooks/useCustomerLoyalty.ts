/**
 * Phase 3A: Customer Loyalty Hook
 * 
 * Fetches and computes customer loyalty data.
 * Tier is calculated client-side from raw data for consistency.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateLoyaltyTier, type LoyaltyData, type LoyaltyTier } from '@/utils/loyaltyHelpers';

export interface CustomerLoyaltyRecord {
  id: string;
  customer_id: string;
  lifetime_orders: number;
  lifetime_revenue: number;
  last_order_at: string | null;
  loyalty_tier: LoyaltyTier;
  updated_at: string;
}

/**
 * Fetch loyalty data for a single customer
 */
export function useCustomerLoyalty(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-loyalty', customerId],
    queryFn: async (): Promise<LoyaltyData | null> => {
      if (!customerId) return null;

      // First try to get existing loyalty record
      const { data: existingRecord, error: fetchError } = await supabase
        .from('customer_loyalty')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching loyalty data:', fetchError);
      }

      if (existingRecord) {
        // Re-calculate tier to ensure consistency
        const calculatedTier = calculateLoyaltyTier(
          existingRecord.lifetime_orders,
          Number(existingRecord.lifetime_revenue)
        );

        return {
          lifetime_orders: existingRecord.lifetime_orders,
          lifetime_revenue: Number(existingRecord.lifetime_revenue),
          last_order_at: existingRecord.last_order_at,
          loyalty_tier: calculatedTier,
        };
      }

      // If no record exists, compute from orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, status')
        .eq('customer_id', customerId)
        .not('status', 'in', '("cancelled","draft")');

      if (ordersError) {
        console.error('Error fetching orders for loyalty:', ordersError);
        return null;
      }

      const lifetimeOrders = orders?.length || 0;
      const lifetimeRevenue = orders?.reduce(
        (sum, order) => sum + Number(order.total_amount || 0),
        0
      ) || 0;
      const lastOrderAt = orders?.length
        ? orders.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0].created_at
        : null;

      const calculatedTier = calculateLoyaltyTier(lifetimeOrders, lifetimeRevenue);

      return {
        lifetime_orders: lifetimeOrders,
        lifetime_revenue: lifetimeRevenue,
        last_order_at: lastOrderAt,
        loyalty_tier: calculatedTier,
      };
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Fetch loyalty data for multiple customers (bulk)
 */
export function useBulkCustomerLoyalty(customerIds: string[]) {
  return useQuery({
    queryKey: ['bulk-customer-loyalty', customerIds.sort().join(',')],
    queryFn: async (): Promise<Map<string, LoyaltyData>> => {
      if (!customerIds.length) return new Map();

      const loyaltyMap = new Map<string, LoyaltyData>();

      // Fetch existing loyalty records
      const { data: records, error } = await supabase
        .from('customer_loyalty')
        .select('*')
        .in('customer_id', customerIds);

      if (error) {
        console.error('Error fetching bulk loyalty data:', error);
        return loyaltyMap;
      }

      // Map existing records
      records?.forEach((record) => {
        const calculatedTier = calculateLoyaltyTier(
          record.lifetime_orders,
          Number(record.lifetime_revenue)
        );

        loyaltyMap.set(record.customer_id, {
          lifetime_orders: record.lifetime_orders,
          lifetime_revenue: Number(record.lifetime_revenue),
          last_order_at: record.last_order_at,
          loyalty_tier: calculatedTier,
        });
      });

      // For customers without records, provide default
      customerIds.forEach((id) => {
        if (!loyaltyMap.has(id)) {
          loyaltyMap.set(id, {
            lifetime_orders: 0,
            lifetime_revenue: 0,
            last_order_at: null,
            loyalty_tier: 'bronze',
          });
        }
      });

      return loyaltyMap;
    },
    enabled: customerIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get customer's recent orders (for commercial signal calculation)
 */
export function useCustomerRecentOrders(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-recent-orders', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, status, payment_status')
        .eq('customer_id', customerId)
        .gte('created_at', ninetyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recent orders:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  });
}
