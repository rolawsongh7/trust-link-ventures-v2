import { supabase } from '@/integrations/supabase/client';

interface QuoteConfirmationData {
  quoteId: string;
  customerName: string;
  companyName: string;
  contactName?: string;
  industry?: string;
}

export class EmailService {
  /**
   * Send MFA enabled alert email
   */
  static async sendMFAEnabledAlert(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: 'Multi-Factor Authentication Enabled - SeaPro SAS',
          type: 'security-alert',
          data: {
            alertType: 'MFA Enabled',
            message: 'Multi-factor authentication has been successfully enabled on your account.',
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error sending MFA enabled alert:', error);
      return false;
    }
  }
  /**
   * Send welcome email to new users
   */
  static async sendWelcomeEmail(email: string, name?: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: 'Welcome to SeaPro SAS!',
          type: 'welcome',
          data: { name: name || 'Valued Customer' }
        }
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, resetLink: string, name?: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: 'Reset Your Password - SeaPro SAS',
          type: 'password-reset',
          data: { 
            name: name || 'User',
            resetLink 
          }
        }
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Send email verification
   */
  static async sendVerificationEmail(email: string, verificationLink: string, name?: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: 'Verify Your Email - SeaPro SAS',
          type: 'verification',
          data: { 
            name: name || 'User',
            verificationLink 
          }
        }
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
  }

  /**
   * Send quote confirmation email
   */
  static async sendQuoteConfirmation(email: string, data: QuoteConfirmationData): Promise<boolean> {
    try {
      const { data: result, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: `Quote Request Confirmation - ${data.quoteId}`,
          type: 'quote-confirmation',
          data: {
            quoteId: data.quoteId,
            customerName: data.customerName,
            companyName: data.companyName,
            contactName: data.contactName,
            industry: data.industry
          }
        }
      });

      if (error) throw error;
      return result?.success || false;
    } catch (error) {
      console.error('Error sending quote confirmation email:', error);
      return false;
    }
  }

  /**
   * Send security alert email
   */
  static async sendLoginAlert(email: string, location: string, ipAddress: string, userAgent: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: 'Security Alert - New Login Detected',
          type: 'security-alert',
          data: {
            location,
            ipAddress,
            userAgent,
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error sending security alert email:', error);
      return false;
    }
  }

  /**
   * Send quote approval magic link
   */
  static async sendQuoteApprovalLink(
    quoteId: string,
    customerEmail: string,
    customerName?: string,
    companyName?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-quote-approval-link', {
        body: {
          quoteId,
          customerEmail,
          customerName,
          companyName
        }
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error sending quote approval link:', error);
      return false;
    }
  }

  /**
   * Send order tracking magic link
   */
  static async sendOrderTrackingLink(
    orderId: string,
    customerEmail: string,
    customerName?: string,
    companyName?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-order-tracking-link', {
        body: {
          orderId,
          customerEmail,
          customerName,
          companyName
        }
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error sending order tracking link:', error);
      return false;
    }
  }

  /**
   * Send custom email with template
   */
  static async sendCustomEmail(
    email: string, 
    subject: string, 
    templateType: string, 
    templateData: any
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject,
          type: templateType,
          data: templateData
        }
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error sending custom email:', error);
      return false;
    }
  }
}