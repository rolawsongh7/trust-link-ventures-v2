import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from './useCustomerAuth';

export const usePendingAddressRequests = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const { profile } = useCustomerAuth();

  useEffect(() => {
    if (!profile?.email) {
      setPendingCount(0);
      return;
    }

    fetchPendingCount();

    // Set up real-time subscription
    const channel = supabase
      .channel('pending-address-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.email]);

  const fetchPendingCount = async () => {
    if (!profile?.email) return;

    try {
      // Get customer record
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', profile.email)
        .single();

      if (!customer) {
        setPendingCount(0);
        return;
      }

      // Count orders with pending address requests
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customer.id)
        .is('delivery_address_id', null)
        .not('delivery_address_requested_at', 'is', null);

      if (!error && count !== null) {
        setPendingCount(count);
      } else {
        setPendingCount(0);
      }
    } catch (error) {
      console.error('Error fetching pending address request count:', error);
      setPendingCount(0);
    }
  };

  return { pendingCount };
};
