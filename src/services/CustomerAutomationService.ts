/**
 * Phase 4.3: Customer Automation Service
 * Handles customer-facing automated notifications with throttling and preference checking
 */

import { supabase } from '@/integrations/supabase/client';
import { NotificationService } from '@/services/notificationService';
import { EMAIL_CONFIG } from '@/lib/emailConfig';

// ============================================
// Constants
// ============================================

/**
 * Throttle windows in hours for different notification types
 * Prevents notification spam by limiting frequency per entity
 */
export const THROTTLE_WINDOWS = {
  payment_reminder: 48,      // 48 hours between payment reminders
  balance_reminder: 72,      // 72 hours between balance reminders
  status_notification: 1,    // 1 hour debounce for rapid status changes
  delay_notice: 48,          // 48 hours between delay notices
  payment_received: 1,       // 1 hour for payment acknowledgements
} as const;

export type CustomerNotificationType = keyof typeof THROTTLE_WINDOWS;

/**
 * Attribution message for all automated customer communications
 */
export const AUTOMATION_ATTRIBUTION = 'Automated update from Trust Link Ventures';

// ============================================
// Types
// ============================================

interface CustomerEmailConfig {
  notification_type: CustomerNotificationType;
  orderId: string;
  orderNumber?: string;
  customerId: string;
  customerEmail: string;
  customerName?: string;
  message?: string;
  additionalData?: Record<string, unknown>;
}

interface CustomerNotificationConfig {
  orderId: string;
  orderNumber?: string;
  customerId: string;
  userId: string; // User ID to receive notification
  title: string;
  message: string;
  notificationType: CustomerNotificationType;
}

interface ThrottleCheckResult {
  isThrottled: boolean;
  lastExecutedAt?: string;
  hoursRemaining?: number;
}

interface SendResult {
  success: boolean;
  throttled?: boolean;
  prefsDisabled?: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

// ============================================
// Customer Automation Service
// ============================================

export class CustomerAutomationService {
  /**
   * Check if customer has notifications enabled
   */
  static async isCustomerNotificationsEnabled(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('order_updates, email_enabled')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[CustomerAutomation] Error checking preferences:', error);
        return true; // Default to enabled if check fails
      }

      // If no preferences exist, default to enabled
      if (!data) {
        return true;
      }

      // Both order_updates and email_enabled must be true
      return data.order_updates !== false && data.email_enabled !== false;
    } catch (error) {
      console.error('[CustomerAutomation] Error in preferences check:', error);
      return true; // Default to enabled on error
    }
  }

  /**
   * Check if a notification is throttled for a given entity
   */
  static async isThrottled(
    ruleId: string,
    entityId: string,
    notificationType: CustomerNotificationType
  ): Promise<ThrottleCheckResult> {
    try {
      const throttleHours = THROTTLE_WINDOWS[notificationType] || 24;
      const windowStart = new Date(Date.now() - throttleHours * 60 * 60 * 1000).toISOString();

      // Check for recent successful executions of this rule for this entity
      const { data, error } = await supabase
        .from('automation_executions')
        .select('executed_at, result')
        .eq('rule_id', ruleId)
        .eq('entity_id', entityId)
        .eq('status', 'success')
        .gte('executed_at', windowStart)
        .order('executed_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[CustomerAutomation] Error checking throttle:', error);
        return { isThrottled: false }; // Allow if check fails
      }

      if (data && data.length > 0) {
        // Check if the previous execution actually sent a customer notification
        const result = data[0].result as Record<string, unknown> | null;
        if (result?.customerNotified === true) {
          const lastExecutedAt = data[0].executed_at;
          const lastExecutedDate = new Date(lastExecutedAt);
          const hoursRemaining = Math.ceil(
            (throttleHours - (Date.now() - lastExecutedDate.getTime()) / (60 * 60 * 1000))
          );

          return {
            isThrottled: true,
            lastExecutedAt,
            hoursRemaining: Math.max(0, hoursRemaining),
          };
        }
      }

      return { isThrottled: false };
    } catch (error) {
      console.error('[CustomerAutomation] Error in throttle check:', error);
      return { isThrottled: false };
    }
  }

  /**
   * Send automated customer email via Edge Function
   */
  static async sendCustomerEmail(config: CustomerEmailConfig): Promise<SendResult> {
    try {
      console.log('[CustomerAutomation] Sending customer email:', {
        type: config.notification_type,
        orderId: config.orderId,
        customerEmail: config.customerEmail,
      });

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: config.customerEmail,
          subject: this.getEmailSubject(config.notification_type, config.orderNumber),
          type: 'automated_customer_notification',
          data: {
            notification_type: config.notification_type,
            customerName: config.customerName || 'Valued Customer',
            orderNumber: config.orderNumber,
            orderId: config.orderId,
            message: config.message,
            customerPortalLink: 'https://trustlinkcompany.com/portal/orders',
            supportEmail: EMAIL_CONFIG.SUPPORT,
            attribution: AUTOMATION_ATTRIBUTION,
            ...config.additionalData,
          },
        },
      });

      if (error) {
        console.error('[CustomerAutomation] Email send failed:', error);
        return {
          success: false,
          message: error.message || 'Failed to send email',
        };
      }

      return {
        success: true,
        message: 'Customer email sent successfully',
        data: {
          customerNotified: true,
          emailType: config.notification_type,
          automated: true,
        },
      };
    } catch (error) {
      console.error('[CustomerAutomation] Error sending email:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send in-app notification to customer
   */
  static async sendCustomerNotification(config: CustomerNotificationConfig): Promise<SendResult> {
    try {
      console.log('[CustomerAutomation] Sending in-app notification:', {
        type: config.notificationType,
        orderId: config.orderId,
        userId: config.userId,
      });

      await NotificationService.createNotification({
        userId: config.userId,
        type: 'order_update' as any,
        title: config.title,
        message: `${config.message} — ${AUTOMATION_ATTRIBUTION}`,
        metadata: {
          order_id: config.orderId,
          order_number: config.orderNumber,
          notification_type: config.notificationType,
          automated: true,
        },
      });

      return {
        success: true,
        message: 'Customer notification sent',
        data: {
          customerNotified: true,
          notificationType: config.notificationType,
          automated: true,
        },
      };
    } catch (error) {
      console.error('[CustomerAutomation] Error sending notification:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get email subject line based on notification type
   */
  private static getEmailSubject(
    notificationType: CustomerNotificationType,
    orderNumber?: string
  ): string {
    const orderRef = orderNumber ? ` - Order #${orderNumber}` : '';
    
    switch (notificationType) {
      case 'payment_reminder':
        return `Payment Reminder${orderRef}`;
      case 'balance_reminder':
        return `Balance Due Reminder${orderRef}`;
      case 'status_notification':
        return `Order Status Update${orderRef}`;
      case 'delay_notice':
        return `Delivery Update${orderRef}`;
      case 'payment_received':
        return `Payment Received${orderRef}`;
      default:
        return `Order Update${orderRef}`;
    }
  }

  /**
   * Log customer communication to audit trail
   */
  static async logCustomerCommunication(
    orderId: string,
    customerId: string,
    notificationType: string,
    channel: 'email' | 'notification',
    success: boolean
  ): Promise<void> {
    try {
      // Use the communications table to log automated messages
      await supabase.from('communications').insert({
        order_id: orderId,
        customer_id: customerId,
        communication_type: channel === 'email' ? 'email' : 'note',
        direction: 'outbound',
        subject: `Automated: ${notificationType}`,
        content: `Automated ${notificationType} ${channel} ${success ? 'sent' : 'failed'}. ${AUTOMATION_ATTRIBUTION}`,
        submission_metadata: {
          automated: true,
          notification_type: notificationType,
          channel,
          success,
          sent_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[CustomerAutomation] Failed to log communication:', error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }
}
