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
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 3;

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
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Quotes realtime active');
          setReconnectAttempts(0);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Quotes realtime error:', err);
          
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
            setTimeout(() => setReconnectAttempts(prev => prev + 1), delay);
            toast({
              title: 'Reconnecting',
              description: `Quote updates reconnecting... (${reconnectAttempts + 1}/${maxReconnectAttempts})`,
            });
          } else {
            toast({
              title: 'Connection Error',
              description: 'Unable to connect to live quote updates.',
              variant: 'destructive',
            });
          }
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Quotes realtime timed out');
          if (reconnectAttempts < maxReconnectAttempts) {
            setReconnectAttempts(prev => prev + 1);
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, toast, reconnectAttempts]);

  return { quotes, loading, setQuotes };
};
