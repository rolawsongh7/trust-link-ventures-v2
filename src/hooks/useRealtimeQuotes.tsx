import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Quote {
  id: string;
  quote_number: string;
  status: string;
  total_amount: number;
  [key: string]: any;
}

export const useRealtimeQuotes = (customerId?: string) => {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    const fetchQuotes = async () => {
      try {
        let query = supabase
          .from('quotes')
          .select('*')
          .order('created_at', { ascending: false });

        if (customerId) {
          query = query.eq('customer_id', customerId);
        }

        const { data, error } = await query;

        if (error) throw error;
        setQuotes(data || []);
      } catch (error) {
        console.error('Error fetching quotes:', error);
        toast({
          title: 'Error',
          description: 'Failed to load quotes',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();

    // Set up realtime subscription
    const channel = supabase
      .channel('quotes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: customerId ? `customer_id=eq.${customerId}` : undefined,
        },
        (payload) => {
          console.log('Quote change detected:', payload);

          if (payload.eventType === 'INSERT') {
            setQuotes((prev) => [payload.new as Quote, ...prev]);
            toast({
              title: 'New Quote',
              description: `Quote ${(payload.new as Quote).quote_number} created`,
            });
          } else if (payload.eventType === 'UPDATE') {
            setQuotes((prev) =>
              prev.map((quote) =>
                quote.id === payload.new.id ? (payload.new as Quote) : quote
              )
            );
            
            // Notify on status change
            const oldStatus = (payload.old as Quote)?.status;
            const newStatus = (payload.new as Quote)?.status;
            if (oldStatus !== newStatus) {
              toast({
                title: 'Quote Status Updated',
                description: `Quote ${(payload.new as Quote).quote_number} is now ${newStatus}`,
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setQuotes((prev) => prev.filter((quote) => quote.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, toast]);

  return { quotes, loading, setQuotes };
};
