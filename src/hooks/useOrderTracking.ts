import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OrderStatusUpdate {
  orderId: string;
  oldStatus: string;
  newStatus: string;
  customerEmail: string;
  customerName?: string;
  companyName?: string;
}

export const useOrderTracking = () => {
  const { toast } = useToast();

  const sendTrackingEmail = async (params: OrderStatusUpdate) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-order-tracking-link', {
        body: {
          orderId: params.orderId,
          customerEmail: params.customerEmail,
          customerName: params.customerName,
          companyName: params.companyName,
        },
      });

      if (error) throw error;

      console.log('Tracking email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending tracking email:', error);
      toast({
        title: "Email Error",
        description: "Failed to send order tracking email",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  const updateOrderStatusWithNotification = async (
    orderId: string,
    newStatus: string,
    customerEmail: string,
    customerName?: string,
    companyName?: string
  ) => {
    try {
      // Get old status first
      const { data: oldOrder } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      // Update order status
      const { data: order, error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus as any })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Send tracking email for specific status changes
      const emailStatuses = ['shipped', 'delivered', 'ready_to_ship', 'processing'];
      if (emailStatuses.includes(newStatus)) {
        await sendTrackingEmail({
          orderId,
          oldStatus: oldOrder?.status || 'pending',
          newStatus,
          customerEmail,
          customerName,
          companyName,
        });
      }

      toast({
        title: "Order Updated",
        description: `Order status updated to ${newStatus.replace(/_/g, ' ')}`,
      });

      return { success: true, order };
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update order status",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  return {
    sendTrackingEmail,
    updateOrderStatusWithNotification,
  };
};
