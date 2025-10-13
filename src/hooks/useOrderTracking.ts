import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NotificationService } from '@/services/notificationService';

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

      // Get customer_id for notifications
      const { data: customerData } = await supabase
        .from('orders')
        .select('customer_id, order_number')
        .eq('id', orderId)
        .single();

      // Send in-app and email notifications based on status
      if (customerData?.customer_id) {
        const orderNumber = customerData.order_number;
        
        switch (newStatus) {
          case 'processing':
            await NotificationService.sendOrderConfirmedNotification(
              customerData.customer_id,
              orderNumber,
              orderId,
              customerEmail
            );
            break;
          case 'ready_to_ship':
            await NotificationService.sendOrderReadyToShipNotification(
              customerData.customer_id,
              orderNumber,
              orderId,
              customerEmail
            );
            break;
          case 'shipped':
            await NotificationService.sendOrderShippedNotification(
              customerData.customer_id,
              orderNumber,
              orderId,
              customerEmail,
              order.tracking_number || undefined
            );
            break;
          case 'delivered':
            await NotificationService.sendOrderDeliveredNotification(
              customerData.customer_id,
              orderNumber,
              orderId,
              customerEmail
            );
            break;
        }
      }

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
