import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';

interface NavigationCounts {
  orders: number;
  quotes: number;
  leads: number;
  communications: number;
  quoteInquiries: number;
  orderIssues: number;
  atRisk: number;
}

// SLA thresholds for at-risk calculation (mirrors slaHelpers.ts)
const SLA_THRESHOLDS: Record<string, number> = {
  pending_payment: 3,
  order_confirmed: 1,
  processing: 2,
  ready_to_ship: 1,
  shipped: 7,
};

const TERMINAL_STATUSES = ['delivered', 'cancelled'];

export const useNavigationCounts = () => {
  return useQuery({
    queryKey: ['navigation-counts'],
    queryFn: async (): Promise<NavigationCounts> => {
      const [ordersResult, quotesResult, leadsResult, communicationsResult, quoteInquiriesResult, orderIssuesResult, allOrdersResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending_payment', 'order_confirmed', 'processing']),
        supabase
          .from('quotes')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'draft'),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new'),
        supabase
          .from('communications')
          .select('id', { count: 'exact', head: true })
          .is('completed_date', null),
        supabase
          .from('quote_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('order_issues')
          .select('id', { count: 'exact', head: true })
          .in('status', ['submitted', 'reviewing']),
        // Fetch active orders to calculate at-risk count
        supabase
          .from('orders')
          .select('id, status, created_at, payment_confirmed_at, processing_started_at, ready_to_ship_at, shipped_at')
          .not('status', 'in', '("delivered","cancelled")')
      ]);

      // Calculate at-risk count client-side
      let atRiskCount = 0;
      if (allOrdersResult.data) {
        const now = new Date();
        for (const order of allOrdersResult.data) {
          const status = order.status;
          const threshold = SLA_THRESHOLDS[status] ?? 2;
          
          // Determine stage entry date
          let entryDate: Date | null = null;
          switch (status) {
            case 'pending_payment':
              entryDate = order.created_at ? new Date(order.created_at) : null;
              break;
            case 'order_confirmed':
              entryDate = order.payment_confirmed_at ? new Date(order.payment_confirmed_at) : 
                         order.created_at ? new Date(order.created_at) : null;
              break;
            case 'processing':
              entryDate = order.processing_started_at ? new Date(order.processing_started_at) : null;
              break;
            case 'ready_to_ship':
              entryDate = order.ready_to_ship_at ? new Date(order.ready_to_ship_at) : null;
              break;
            case 'shipped':
              entryDate = order.shipped_at ? new Date(order.shipped_at) : null;
              break;
            default:
              entryDate = order.created_at ? new Date(order.created_at) : null;
          }
          
          if (entryDate) {
            const daysInStage = differenceInDays(now, entryDate);
            const percentConsumed = daysInStage / threshold;
            if (percentConsumed >= 0.75) {
              atRiskCount++;
            }
          }
        }
      }

      return {
        orders: ordersResult.count || 0,
        quotes: quotesResult.count || 0,
        leads: leadsResult.count || 0,
        communications: communicationsResult.count || 0,
        quoteInquiries: quoteInquiriesResult.count || 0,
        orderIssues: orderIssuesResult.count || 0,
        atRisk: atRiskCount,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};
