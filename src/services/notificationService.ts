import { supabase } from '@/integrations/supabase/client';

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'quote_ready' | 'quote_accepted' | 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'system';
  link?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  static async createNotification(data: NotificationData): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .insert({
          user_id: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          link: data.link,
          metadata: data.metadata || {},
        });

      if (error) {
        console.error('Error creating notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error creating notification:', error);
      return false;
    }
  }

  static async sendQuoteReadyNotification(
    userId: string,
    quoteNumber: string,
    quoteId: string,
    customerEmail: string
  ): Promise<void> {
    // Create in-app notification
    await this.createNotification({
      userId,
      title: 'Quote Ready',
      message: `Your quote ${quoteNumber} is ready for review`,
      type: 'quote_ready',
      link: `/customer-portal/quotes`,
      metadata: { quoteId, quoteNumber }
    });

    // Send email
    await supabase.functions.invoke('send-email', {
      body: {
        to: customerEmail,
        subject: `Quote ${quoteNumber} is Ready`,
        type: 'quote_ready',
        data: {
          quoteNumber,
          quoteId,
          customerPortalLink: `${window.location.origin}/customer-portal/quotes`
        }
      }
    });
  }

  static async sendQuoteAcceptedNotification(
    quoteNumber: string,
    customerEmail: string
  ): Promise<void> {
    // Send email to admin
    await supabase.functions.invoke('send-email', {
      body: {
        to: 'trustlventuresghana_a01@yahoo.com',
        subject: `Quote ${quoteNumber} Accepted`,
        type: 'quote_accepted',
        data: {
          quoteNumber,
          customerEmail
        }
      }
    });
  }

  static async sendOrderConfirmedNotification(
    userId: string,
    orderNumber: string,
    orderId: string,
    customerEmail: string
  ): Promise<void> {
    // Create in-app notification
    await this.createNotification({
      userId,
      title: 'Order Confirmed',
      message: `Your order ${orderNumber} has been confirmed`,
      type: 'order_confirmed',
      link: `/customer-portal/orders`,
      metadata: { orderId, orderNumber }
    });

    // Send email
    await supabase.functions.invoke('send-email', {
      body: {
        to: customerEmail,
        subject: `Order ${orderNumber} Confirmed`,
        type: 'order_confirmed',
        data: {
          orderNumber,
          orderId,
          trackingLink: `${window.location.origin}/customer-portal/orders`
        }
      }
    });
  }

  static async sendOrderShippedNotification(
    userId: string,
    orderNumber: string,
    orderId: string,
    customerEmail: string,
    trackingNumber?: string
  ): Promise<void> {
    // Create in-app notification
    await this.createNotification({
      userId,
      title: 'Order Shipped',
      message: `Your order ${orderNumber} has been shipped${trackingNumber ? ` - Tracking: ${trackingNumber}` : ''}`,
      type: 'order_shipped',
      link: `/customer-portal/orders`,
      metadata: { orderId, orderNumber, trackingNumber }
    });

    // Send email
    await supabase.functions.invoke('send-email', {
      body: {
        to: customerEmail,
        subject: `Order ${orderNumber} Shipped`,
        type: 'order_shipped',
        data: {
          orderNumber,
          orderId,
          trackingNumber,
          trackingLink: `${window.location.origin}/customer-portal/orders`
        }
      }
    });
  }

  static async sendOrderDeliveredNotification(
    userId: string,
    orderNumber: string,
    orderId: string,
    customerEmail: string
  ): Promise<void> {
    // Create in-app notification
    await this.createNotification({
      userId,
      title: 'Order Delivered',
      message: `Your order ${orderNumber} has been delivered`,
      type: 'order_delivered',
      link: `/customer-portal/orders`,
      metadata: { orderId, orderNumber }
    });

    // Send email
    await supabase.functions.invoke('send-email', {
      body: {
        to: customerEmail,
        subject: `Order ${orderNumber} Delivered`,
        type: 'order_delivered',
        data: {
          orderNumber,
          orderId
        }
      }
    });
  }
}
