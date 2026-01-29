import { supabase } from '@/integrations/supabase/client';

export type ActionEventType = 
  // Customer action types
  | 'payment_required'
  | 'payment_needed'
  | 'address_required'
  | 'address_needed'
  | 'quote_pending'
  | 'quote_expiring'
  | 'issue_response_needed'
  // New payment-specific events (partial payment workflow)
  | 'deposit_received'       // Customer: "Deposit of X received, balance Y remaining"
  | 'deposit_verified'       // Customer: "Deposit verified, order proceeding"
  | 'balance_requested'      // Customer: "Balance payment of X required for shipping"
  | 'balance_received'       // Admin: "Balance payment uploaded for order X"
  | 'balance_verified'       // Customer: "Balance verified, order cleared for shipping"
  | 'order_fully_paid'       // Both: System event for analytics/triggers
  // Admin action types
  | 'new_quote_request'
  | 'payment_uploaded'
  | 'new_issue'
  | 'order_sla_breach';

export type EntityType = 'order' | 'quote' | 'issue' | 'invoice';

export interface ActionEvent {
  userId: string;
  role: 'customer' | 'admin';
  type: ActionEventType;
  title: string;
  message: string;
  entityType: EntityType;
  entityId: string;
  deepLink: string;
  sendPush?: boolean;
  sendEmail?: boolean;
  emailData?: {
    to: string;
    subject: string;
    type: string;
    data: Record<string, any>;
  };
}

export class ActionEventService {
  /**
   * Emit a unified action event:
   * 1. Insert into user_notifications with requires_action=true
   * 2. Trigger push notification via edge function (if sendPush=true)
   * 3. Optionally send email (if sendEmail=true)
   */
  static async emit(event: ActionEvent): Promise<boolean> {
    try {
      // 1. Insert notification with action fields
      const { data: notification, error } = await supabase
        .from('user_notifications')
        .insert({
          user_id: event.userId,
          title: event.title,
          message: event.message,
          type: event.type,
          link: event.deepLink,
          requires_action: true,
          resolved: false,
          entity_type: event.entityType,
          entity_id: event.entityId,
          deep_link: event.deepLink,
          role: event.role,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating action notification:', error);
        return false;
      }

      // 2. Send push notification if enabled
      if (event.sendPush && notification) {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: event.userId,
            title: event.title,
            body: event.message,
            link: event.deepLink,
            data: { 
              entityType: event.entityType, 
              entityId: event.entityId,
              notificationId: notification.id
            }
          }
        }).catch(err => {
          console.error('Push notification error (non-blocking):', err);
        });
      }

      // 3. Send email if enabled
      if (event.sendEmail && event.emailData) {
        await supabase.functions.invoke('send-email', {
          body: event.emailData
        }).catch(err => {
          console.error('Email notification error (non-blocking):', err);
        });
      }

      console.log('Action event emitted:', event.type, event.entityType, event.entityId);
      return true;
    } catch (error) {
      console.error('Error emitting action event:', error);
      return false;
    }
  }

  /**
   * Emit action events to all admin users
   */
  static async emitToAdmins(event: Omit<ActionEvent, 'userId' | 'role'>): Promise<boolean> {
    try {
      // Use the notify-admins edge function which handles finding all admins
      const { error } = await supabase.functions.invoke('notify-admins', {
        body: {
          type: event.type,
          title: event.title,
          message: event.message,
          link: event.deepLink,
          requiresAction: true,
          entityType: event.entityType,
          entityId: event.entityId,
          deepLink: event.deepLink,
          metadata: {
            entityType: event.entityType,
            entityId: event.entityId
          }
        }
      });

      if (error) {
        console.error('Error notifying admins:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error emitting admin action event:', error);
      return false;
    }
  }

  /**
   * Mark a specific action as resolved by notification ID
   */
  static async resolveById(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ 
          resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', notificationId)
        .eq('resolved', false);

      if (error) {
        console.error('Error resolving action:', error);
        return false;
      }

      console.log('Action resolved by ID:', notificationId);
      return true;
    } catch (error) {
      console.error('Error resolving action:', error);
      return false;
    }
  }

  /**
   * Resolve all actions for a specific entity
   * This is the primary method to call when an action is completed
   */
  static async resolve(
    entityType: EntityType, 
    entityId: string, 
    actionTypes?: ActionEventType[]
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('user_notifications')
        .update({ 
          resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('resolved', false);

      // If specific action types provided, filter by them
      if (actionTypes && actionTypes.length > 0) {
        query = query.in('type', actionTypes);
      }

      const { error } = await query;

      if (error) {
        console.error('Error resolving actions:', error);
        return false;
      }

      console.log('Actions resolved for entity:', entityType, entityId, actionTypes);
      return true;
    } catch (error) {
      console.error('Error resolving actions:', error);
      return false;
    }
  }

  /**
   * Resolve all actions of a specific type for a user
   */
  static async resolveByType(
    userId: string, 
    actionTypes: ActionEventType[]
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ 
          resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .in('type', actionTypes)
        .eq('resolved', false);

      if (error) {
        console.error('Error resolving actions by type:', error);
        return false;
      }

      console.log('Actions resolved by type:', actionTypes);
      return true;
    } catch (error) {
      console.error('Error resolving actions by type:', error);
      return false;
    }
  }

  // ============ CONVENIENCE METHODS FOR COMMON EVENTS ============

  /**
   * Emit payment required action for customer
   */
  static async emitPaymentRequired(
    userId: string,
    orderId: string,
    orderNumber: string,
    customerEmail?: string
  ): Promise<boolean> {
    return this.emit({
      userId,
      role: 'customer',
      type: 'payment_required',
      title: 'Payment Required',
      message: `Please upload payment proof for order ${orderNumber}`,
      entityType: 'order',
      entityId: orderId,
      deepLink: `/portal/orders?uploadPayment=${orderId}`,
      sendPush: true,
      sendEmail: !!customerEmail,
      emailData: customerEmail ? {
        to: customerEmail,
        subject: `Payment Required - Order ${orderNumber}`,
        type: 'payment_required',
        data: { orderNumber, orderId }
      } : undefined
    });
  }

  /**
   * Emit address confirmation required action for customer
   */
  static async emitAddressRequired(
    userId: string,
    orderId: string,
    orderNumber: string,
    customerEmail?: string
  ): Promise<boolean> {
    return this.emit({
      userId,
      role: 'customer',
      type: 'address_required',
      title: 'Delivery Address Required',
      message: `Please confirm your delivery address for order ${orderNumber}`,
      entityType: 'order',
      entityId: orderId,
      deepLink: `/portal/orders?addressNeeded=${orderId}`,
      sendPush: true,
      sendEmail: !!customerEmail,
      emailData: customerEmail ? {
        to: customerEmail,
        subject: `Delivery Address Required - Order ${orderNumber}`,
        type: 'address_required',
        data: { orderNumber, orderId }
      } : undefined
    });
  }

  /**
   * Emit quote pending action for customer
   */
  static async emitQuotePending(
    userId: string,
    quoteId: string,
    quoteNumber: string,
    customerEmail?: string
  ): Promise<boolean> {
    return this.emit({
      userId,
      role: 'customer',
      type: 'quote_pending',
      title: 'Quote Ready for Review',
      message: `Your quote ${quoteNumber} is ready for review`,
      entityType: 'quote',
      entityId: quoteId,
      deepLink: `/portal/quotes?open=${quoteId}`,
      sendPush: true,
      sendEmail: !!customerEmail,
      emailData: customerEmail ? {
        to: customerEmail,
        subject: `Quote ${quoteNumber} Ready`,
        type: 'quote_ready',
        data: { quoteNumber, quoteId }
      } : undefined
    });
  }

  /**
   * Emit quote expiring action for customer
   */
  static async emitQuoteExpiring(
    userId: string,
    quoteId: string,
    quoteNumber: string,
    expiresIn: string
  ): Promise<boolean> {
    return this.emit({
      userId,
      role: 'customer',
      type: 'quote_expiring',
      title: 'Quote Expiring Soon',
      message: `Quote ${quoteNumber} expires ${expiresIn}`,
      entityType: 'quote',
      entityId: quoteId,
      deepLink: `/portal/quotes?open=${quoteId}`,
      sendPush: true
    });
  }

  /**
   * Emit payment proof uploaded action for admins
   */
  static async emitPaymentUploaded(
    orderId: string,
    orderNumber: string,
    customerName: string
  ): Promise<boolean> {
    return this.emitToAdmins({
      type: 'payment_uploaded',
      title: 'Payment Proof Uploaded',
      message: `${customerName} uploaded payment proof for order ${orderNumber}`,
      entityType: 'order',
      entityId: orderId,
      deepLink: `/admin/orders?filter=pending_verification&highlight=${orderId}`
    });
  }

  /**
   * Emit new issue action for admins
   */
  static async emitNewIssue(
    issueId: string,
    orderNumber: string,
    customerName: string,
    issueType: string
  ): Promise<boolean> {
    return this.emitToAdmins({
      type: 'new_issue',
      title: 'New Order Issue Reported',
      message: `${customerName} reported "${issueType}" for order ${orderNumber}`,
      entityType: 'issue',
      entityId: issueId,
      deepLink: `/admin/orders/issues?highlight=${issueId}`
    });
  }

  // ============ PARTIAL PAYMENT WORKFLOW EVENTS ============

  /**
   * Emit deposit verified notification to customer
   * Shows balance remaining and confirms deposit was received
   */
  static async emitDepositVerified(
    userId: string,
    orderId: string,
    orderNumber: string,
    depositAmount: number,
    balanceRemaining: number,
    currency: string,
    customerEmail?: string
  ): Promise<boolean> {
    return this.emit({
      userId,
      role: 'customer',
      type: 'deposit_verified',
      title: 'Deposit Received',
      message: `Your deposit of ${currency} ${depositAmount.toLocaleString()} for order ${orderNumber} has been verified. Balance remaining: ${currency} ${balanceRemaining.toLocaleString()}`,
      entityType: 'order',
      entityId: orderId,
      deepLink: `/portal/orders?highlight=${orderId}`,
      sendPush: true,
      sendEmail: !!customerEmail,
      emailData: customerEmail ? {
        to: customerEmail,
        subject: `Deposit Received - Order ${orderNumber}`,
        type: 'deposit_verified',
        data: { orderNumber, orderId, depositAmount, balanceRemaining, currency }
      } : undefined
    });
  }

  /**
   * Emit balance payment request to customer
   */
  static async emitBalanceRequested(
    userId: string,
    orderId: string,
    orderNumber: string,
    balanceAmount: number,
    currency: string,
    customerEmail?: string
  ): Promise<boolean> {
    return this.emit({
      userId,
      role: 'customer',
      type: 'balance_requested',
      title: 'Balance Payment Required',
      message: `Please pay the remaining ${currency} ${balanceAmount.toLocaleString()} for order ${orderNumber} to proceed with shipping.`,
      entityType: 'order',
      entityId: orderId,
      deepLink: `/portal/orders?uploadPayment=${orderId}`,
      sendPush: true,
      sendEmail: !!customerEmail,
      emailData: customerEmail ? {
        to: customerEmail,
        subject: `Balance Payment Required - Order ${orderNumber}`,
        type: 'balance_requested',
        data: { orderNumber, orderId, balanceAmount, currency }
      } : undefined
    });
  }

  /**
   * Emit balance payment received notification to admins
   */
  static async emitBalanceReceived(
    orderId: string,
    orderNumber: string,
    customerName: string,
    balanceAmount: number,
    currency: string
  ): Promise<boolean> {
    return this.emitToAdmins({
      type: 'balance_received',
      title: 'Balance Payment Uploaded',
      message: `${customerName} uploaded balance payment of ${currency} ${balanceAmount.toLocaleString()} for order ${orderNumber}`,
      entityType: 'order',
      entityId: orderId,
      deepLink: `/admin/orders?filter=pending_verification&highlight=${orderId}`
    });
  }

  /**
   * Emit balance verified notification to customer
   * Confirms order is now fully paid and cleared for shipping
   */
  static async emitBalanceVerified(
    userId: string,
    orderId: string,
    orderNumber: string,
    totalAmount: number,
    currency: string,
    customerEmail?: string
  ): Promise<boolean> {
    return this.emit({
      userId,
      role: 'customer',
      type: 'balance_verified',
      title: 'Full Payment Confirmed',
      message: `Your order ${orderNumber} (${currency} ${totalAmount.toLocaleString()}) is now fully paid and cleared for shipping.`,
      entityType: 'order',
      entityId: orderId,
      deepLink: `/portal/orders?highlight=${orderId}`,
      sendPush: true,
      sendEmail: !!customerEmail,
      emailData: customerEmail ? {
        to: customerEmail,
        subject: `Payment Complete - Order ${orderNumber}`,
        type: 'balance_verified',
        data: { orderNumber, orderId, totalAmount, currency }
      } : undefined
    });
  }

  /**
   * Emit order fully paid system event
   * Used for analytics, triggers, and admin notifications
   */
  static async emitOrderFullyPaid(
    orderId: string,
    orderNumber: string,
    totalAmount: number,
    currency: string,
    customerName: string
  ): Promise<boolean> {
    return this.emitToAdmins({
      type: 'order_fully_paid',
      title: 'Order Fully Paid',
      message: `Order ${orderNumber} from ${customerName} is now fully paid (${currency} ${totalAmount.toLocaleString()}). Ready for shipping.`,
      entityType: 'order',
      entityId: orderId,
      deepLink: `/admin/orders?highlight=${orderId}`
    });
  }
}
