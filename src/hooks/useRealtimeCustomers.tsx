import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Customer } from './useCustomersQuery';

export const useRealtimeCustomers = (filters?: { status?: string; industry?: string; country?: string }) => {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  useEffect(() => {
    setConnectionStatus('reconnecting');

    const channel = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customers',
        },
        (payload) => {
          const newCustomer = payload.new as Customer;
          
          queryClient.setQueryData<Customer[]>(['customers', filters], (old) => {
            if (!old) return [newCustomer];
            return [newCustomer, ...old];
          });

          toast.success(`New customer: ${newCustomer.company_name}`);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customers',
        },
        (payload) => {
          const updatedCustomer = payload.new as Customer;
          
          queryClient.setQueryData<Customer[]>(['customers', filters], (old) => {
            if (!old) return [updatedCustomer];
            return old.map((customer) =>
              customer.id === updatedCustomer.id ? updatedCustomer : customer
            );
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'customers',
        },
        (payload) => {
          const deletedCustomer = payload.old as Customer;
          
          queryClient.setQueryData<Customer[]>(['customers', filters], (old) => {
            if (!old) return [];
            return old.filter((customer) => customer.id !== deletedCustomer.id);
          });

          toast.info(`Customer removed: ${deletedCustomer.company_name}`);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setConnectionStatus('disconnected');
    };
  }, [queryClient, filters]);

  return { connectionStatus };
};
