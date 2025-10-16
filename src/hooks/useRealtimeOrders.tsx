import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  [key: string]: any;
}

export const useRealtimeOrders = (customerId?: string) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    let retryTimeout: NodeJS.Timeout;

    const fetchOrders = async () => {
      try {
        setError(null);
        let query = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (customerId) {
          query = query.eq('customer_id', customerId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            throw new Error('Network error: Unable to connect to database. Please check your internet connection.');
          } else if (fetchError.code === '42501') {
            throw new Error('Permission denied: You do not have access to view orders.');
          } else {
            throw new Error(`Failed to load orders: ${fetchError.message}`);
          }
        }

        setOrders(data || []);
        setConnectionStatus('connected');
        retryCount = 0;

      } catch (err: any) {
        console.error('Error fetching orders:', err);
        setError(err.message);
        
        if (retryCount < maxRetries) {
          retryCount++;
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          
          console.log(`Retry attempt ${retryCount}/${maxRetries} in ${retryDelay}ms...`);
          setConnectionStatus('reconnecting');
          
          retryTimeout = setTimeout(() => {
            fetchOrders();
          }, retryDelay);
        } else {
          toast({
            title: 'Connection Error',
            description: err.message,
            variant: 'destructive',
            duration: 10000,
          });
          setConnectionStatus('disconnected');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: customerId ? `customer_id=eq.${customerId}` : undefined,
        },
        (payload) => {
          const newOrder = payload.new as Order | undefined;
          const oldOrder = payload.old as Order | undefined;
          console.log('📦 Order change detected:', payload.eventType, newOrder?.order_number || oldOrder?.order_number);

          try {
            if (payload.eventType === 'INSERT') {
              setOrders((prev) => [payload.new as Order, ...prev]);
              toast({
                title: '✨ New Order',
                description: `Order ${(payload.new as Order).order_number} created`,
                duration: 5000,
              });
            } else if (payload.eventType === 'UPDATE') {
              setOrders((prev) =>
                prev.map((order) =>
                  order.id === payload.new.id ? (payload.new as Order) : order
                )
              );
              
              const oldStatus = (payload.old as Order)?.status;
              const newStatus = (payload.new as Order)?.status;
              const orderId = (payload.new as Order)?.id;
              const orderNumber = (payload.new as Order)?.order_number;
              
              if (oldStatus !== newStatus) {
                const statusEmoji = {
                  'order_confirmed': '✅',
                  'pending_payment': '💳',
                  'payment_received': '💰',
                  'processing': '⚙️',
                  'ready_to_ship': '📦',
                  'shipped': '🚚',
                  'delivered': '🎉',
                  'cancelled': '❌',
                  'delivery_failed': '⚠️',
                }[newStatus] || '📋';

                toast({
                  title: `${statusEmoji} Order Status Updated`,
                  description: `Order ${orderNumber} is now ${newStatus.replace(/_/g, ' ')}`,
                  duration: 6000,
                });

                // Auto-generate packing list when status becomes ready_to_ship
                if (newStatus === 'ready_to_ship' && oldStatus !== 'ready_to_ship') {
                  console.log('🔄 Auto-generating packing list for order:', orderNumber);
                  toast({
                    title: '📄 Generating Packing List',
                    description: `Auto-generating packing list for ${orderNumber}...`,
                  });

                  supabase.functions
                    .invoke('generate-packing-list', {
                      body: { orderId },
                    })
                    .then(({ data, error }) => {
                      if (error) {
                        console.error('Packing list generation error:', error);
                        toast({
                          title: '❌ Generation Failed',
                          description: 'Failed to auto-generate packing list',
                          variant: 'destructive',
                        });
                      } else {
                        console.log('✅ Packing list generated:', data);
                        toast({
                          title: '✅ Packing List Generated',
                          description: `Packing list created for ${orderNumber}`,
                        });
                      }
                    })
                    .catch((err) => {
                      console.error('Packing list generation error:', err);
                    });
                }

                // Auto-generate commercial invoice when status becomes shipped
                if (newStatus === 'shipped' && oldStatus !== 'shipped') {
                  console.log('🔄 Auto-generating commercial invoice for order:', orderNumber);
                  toast({
                    title: '📄 Generating Commercial Invoice',
                    description: `Auto-generating invoice for ${orderNumber}...`,
                  });

                  supabase.functions
                    .invoke('generate-commercial-invoice', {
                      body: { orderId },
                    })
                    .then(({ data, error }) => {
                      if (error) {
                        console.error('Commercial invoice generation error:', error);
                        toast({
                          title: '❌ Generation Failed',
                          description: 'Failed to auto-generate commercial invoice',
                          variant: 'destructive',
                        });
                      } else {
                        console.log('✅ Commercial invoice generated:', data);
                        toast({
                          title: '✅ Commercial Invoice Generated',
                          description: `Invoice created for ${orderNumber}`,
                        });
                      }
                    })
                    .catch((err) => {
                      console.error('Commercial invoice generation error:', err);
                    });
                }
              }
            } else if (payload.eventType === 'DELETE') {
              setOrders((prev) => prev.filter((order) => order.id !== payload.old.id));
              toast({
                title: '🗑️ Order Deleted',
                description: `Order ${(payload.old as Order).order_number} was deleted`,
                variant: 'destructive',
              });
            }
          } catch (err) {
            console.error('Error processing realtime update:', err);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription active');
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime subscription error:', err);
          setConnectionStatus('disconnected');
          toast({
            title: 'Real-time Updates Disabled',
            description: 'Unable to connect to live updates. Please refresh to see latest data.',
            variant: 'destructive',
          });
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Realtime subscription timed out');
          setConnectionStatus('reconnecting');
        }
      });

    return () => {
      clearTimeout(retryTimeout);
      supabase.removeChannel(channel);
      setConnectionStatus('disconnected');
    };
  }, [customerId, toast]);

  return { 
    orders, 
    loading, 
    error,
    connectionStatus,
    setOrders 
  };
};
