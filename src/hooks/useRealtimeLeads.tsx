import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Lead } from './useLeadsQuery';

export const useRealtimeLeads = (customerId?: string) => {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 3;

  useEffect(() => {
    setConnectionStatus('reconnecting');

    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          const newLead = payload.new as Lead;
          
          queryClient.setQueryData<Lead[]>(['leads', customerId], (old) => {
            if (!old) return [newLead];
            return [newLead, ...old];
          });

          toast.success(`New lead: ${newLead.title}`);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          const updatedLead = payload.new as Lead;
          const oldLead = payload.old as Lead;
          
          queryClient.setQueryData<Lead[]>(['leads', customerId], (old) => {
            if (!old) return [updatedLead];
            return old.map((lead) =>
              lead.id === updatedLead.id ? updatedLead : lead
            );
          });

          if (oldLead.status !== updatedLead.status) {
            toast.info(`Lead status updated: ${updatedLead.title} → ${updatedLead.status}`);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          const deletedLead = payload.old as Lead;
          
          queryClient.setQueryData<Lead[]>(['leads', customerId], (old) => {
            if (!old) return [];
            return old.filter((lead) => lead.id !== deletedLead.id);
          });

          toast.info(`Lead removed: ${deletedLead.title}`);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Leads realtime active');
          setConnectionStatus('connected');
          setReconnectAttempts(0);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Leads realtime error:', err);
          setConnectionStatus('disconnected');
          
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
            setTimeout(() => setReconnectAttempts(prev => prev + 1), delay);
            toast.info(`Lead updates reconnecting... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          } else {
            toast.error('Unable to connect to live lead updates. Showing cached data.');
          }
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Leads realtime timed out');
          setConnectionStatus('reconnecting');
          if (reconnectAttempts < maxReconnectAttempts) {
            setReconnectAttempts(prev => prev + 1);
          }
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setConnectionStatus('disconnected');
    };
  }, [queryClient, customerId, reconnectAttempts]);

  return { connectionStatus };
};
