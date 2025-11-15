import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface NavigationCounts {
  orders: number;
  quotes: number;
  leads: number;
  communications: number;
  quoteInquiries: number;
}

export const useNavigationCounts = () => {
  return useQuery({
    queryKey: ['navigation-counts'],
    queryFn: async (): Promise<NavigationCounts> => {
      const [ordersResult, quotesResult, leadsResult, communicationsResult, quoteInquiriesResult] = await Promise.all([
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
          .eq('status', 'pending')
      ]);

      return {
        orders: ordersResult.count || 0,
        quotes: quotesResult.count || 0,
        leads: leadsResult.count || 0,
        communications: communicationsResult.count || 0,
        quoteInquiries: quoteInquiriesResult.count || 0,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};
