import { supabase } from '@/integrations/supabase/client';

type NotificationType = 
  | 'quote_ready' 
  | 'quote_accepted' 
  | 'order_confirmed' 
  | 'order_shipped' 
  | 'order_delivered' 
  | 'system'
  // Admin notification types
  | 'new_quote_request'
  | 'new_order'
  | 'payment_proof_uploaded'
  | 'address_confirmed'
  // Order issue types
  | 'order_issue_submitted'
  | 'order_issue_reply'
  | 'order_issue_status_change';

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  metadata?: Record<string, any>;
}

interface AdminNotificationData {
  type: NotificationType;
  title: string;
  message: string;
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

  /**
   * Notify all admin users via the edge function
   */
  static async notifyAllAdmins(data: AdminNotificationData): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('notify-admins', {
        body: data
      });

      if (error) {
        console.error('Error notifying admins:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error notifying admins:', error);
      return false;
    }
  }

  // ============ ADMIN NOTIFICATION METHODS ============

  /**
   * Notify admins when a new quote request is submitted
   */
  static async notifyNewQuoteRequest(
    companyName: string,
    email: string,
    itemCount: number
  ): Promise<void> {
    await this.notifyAllAdmins({
      type: 'new_quote_request',
      title: 'New Quote Request',
      message: `${companyName} (${email}) submitted a quote request for ${itemCount} item(s)`,
      link: '/admin/quote-requests',
      metadata: { companyName, email, itemCount }
    });
  }

  /**
   * Notify admins when a customer accepts a quote
   */
  static async notifyQuoteAccepted(
    quoteNumber: string,
    customerName: string,
    totalAmount: number,
    currency: string
  ): Promise<void> {
    await this.notifyAllAdmins({
      type: 'quote_accepted',
      title: 'Quote Accepted',
      message: `${customerName} accepted quote ${quoteNumber} (${currency} ${totalAmount.toLocaleString()})`,
      link: '/admin/orders',
      metadata: { quoteNumber, customerName, totalAmount, currency }
    });
  }

  /**
   * Notify admins when a new order is created
   */
  static async notifyNewOrder(
    orderNumber: string,
    customerName: string,
    totalAmount: number,
    currency: string
  ): Promise<void> {
    await this.notifyAllAdmins({
      type: 'new_order',
      title: 'New Order Created',
      message: `Order ${orderNumber} created for ${customerName} (${currency} ${totalAmount.toLocaleString()})`,
      link: '/admin/orders',
      metadata: { orderNumber, customerName, totalAmount, currency }
    });
  }

  /**
   * Notify admins when customer confirms delivery address
   */
  static async notifyAddressConfirmed(
    orderNumber: string,
    customerName: string
  ): Promise<void> {
    await this.notifyAllAdmins({
      type: 'address_confirmed',
      title: 'Delivery Address Confirmed',
      message: `${customerName} confirmed delivery address for order ${orderNumber}`,
      link: '/admin/orders',
      metadata: { orderNumber, customerName }
    });
  }

  // ============ CUSTOMER NOTIFICATION METHODS ============

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
      link: `/portal/quotes`,
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
          customerPortalLink: `${window.location.origin}/portal/quotes`
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
      link: `/portal/orders`,
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
          trackingLink: `${window.location.origin}/portal/orders`
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
      link: `/portal/orders`,
      metadata: { orderId, orderNumber, trackingNumber }
    });

    // Email is sent automatically by the generate-commercial-invoice function
    // which includes the invoice PDF attachment
  }

  static async sendOrderReadyToShipNotification(
    userId: string,
    orderNumber: string,
    orderId: string,
    customerEmail: string
  ): Promise<void> {
    // Create in-app notification
    await this.createNotification({
      userId,
      title: 'Order Ready to Ship',
      message: `Your order ${orderNumber} is packed and ready for shipment`,
      type: 'order_shipped',
      link: `/portal/orders`,
      metadata: { orderId, orderNumber }
    });

    // Email is sent automatically by the generate-packing-list function
    // which includes the packing list PDF attachment
  }

  static async sendOrderDeliveredNotification(
    userId: string,
    orderNumber: string,
    orderId: string,
    customerEmail: string,
    hasPOD: boolean = true
  ): Promise<void> {
    // Create in-app notification with POD info
    await this.createNotification({
      userId,
      title: 'Order Delivered',
      message: `Your order ${orderNumber} has been delivered.${hasPOD ? ' Proof of delivery is available in your order details.' : ''}`,
      type: 'order_delivered',
      link: `/portal/orders`,
      metadata: { orderId, orderNumber, hasPOD }
    });

    // Send email with POD info
    await supabase.functions.invoke('send-email', {
      body: {
        to: customerEmail,
        subject: `Order ${orderNumber} Delivered`,
        type: 'order_delivered',
        data: {
          orderNumber,
          orderId,
          hasPOD,
          viewOrderLink: `${window.location.origin}/portal/orders`
        }
      }
    });
  }

  // ============ ORDER ISSUE NOTIFICATION METHODS ============

  /**
   * Notify admins when a customer submits an order issue
   */
  static async notifyOrderIssueSubmitted(
    orderNumber: string,
    customerName: string,
    issueType: string
  ): Promise<void> {
    await this.notifyAllAdmins({
      type: 'order_issue_submitted',
      title: 'New Order Issue Reported',
      message: `${customerName} reported "${issueType}" for order ${orderNumber}`,
      link: '/admin/orders/issues',
      metadata: { orderNumber, customerName, issueType }
    });
  }

  /**
   * Notify customer when admin replies to their issue
   */
  static async notifyIssueReply(
    userId: string,
    orderNumber: string,
    issueId: string,
    customerEmail: string
  ): Promise<void> {
    // Create in-app notification
    await this.createNotification({
      userId,
      title: 'Response to Your Issue Report',
      message: `Support team replied to your issue for order ${orderNumber}`,
      type: 'order_issue_reply',
      link: `/portal/order-issues/${issueId}`,
      metadata: { orderNumber, issueId }
    });

    // Send email notification
    await supabase.functions.invoke('send-email', {
      body: {
        to: customerEmail,
        subject: `Update on Your Order Issue - ${orderNumber}`,
        type: 'order_issue_reply',
        data: {
          orderNumber,
          issueId,
          customerPortalLink: `${window.location.origin}/portal/order-issues/${issueId}`
        }
      }
    });
  }

  /**
   * Notify customer when issue status changes
   */
  static async notifyIssueStatusChange(
    userId: string,
    orderNumber: string,
    issueId: string,
    newStatus: string,
    customerEmail: string
  ): Promise<void> {
    const statusText = newStatus === 'resolved' ? 'Resolved' : 
                       newStatus === 'rejected' ? 'Rejected' : 'Updated';
    
    // Create in-app notification
    await this.createNotification({
      userId,
      title: `Issue ${statusText}`,
      message: `Your issue for order ${orderNumber} has been ${newStatus}`,
      type: 'order_issue_status_change',
      link: `/portal/order-issues/${issueId}`,
      metadata: { orderNumber, issueId, newStatus }
    });

    // Send email notification
    await supabase.functions.invoke('send-email', {
      body: {
        to: customerEmail,
        subject: `Order Issue ${statusText} - ${orderNumber}`,
        type: 'order_issue_status_change',
        data: {
          orderNumber,
          issueId,
          newStatus,
          customerPortalLink: `${window.location.origin}/portal/order-issues/${issueId}`
        }
      }
    });
  }
}
