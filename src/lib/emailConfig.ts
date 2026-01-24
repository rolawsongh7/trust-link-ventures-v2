/**
 * Centralized Email Configuration
 * 
 * All email addresses used throughout the application should be imported from this file
 * to ensure consistent branding and easy maintenance.
 * 
 * Domain: @trustlinkcompany.com
 */

export const EMAIL_CONFIG = {
  /** Primary contact email for general inquiries and notifications */
  PRIMARY: 'info@trustlinkcompany.com',
  
  /** Customer support email for help requests */
  SUPPORT: 'support@trustlinkcompany.com',
  
  /** Quote-related communications */
  QUOTES: 'quotes@trustlinkcompany.com',
  
  /** Order-related communications */
  ORDERS: 'orders@trustlinkcompany.com',
  
  /** Security alerts and notifications */
  SECURITY: 'security@trustlinkcompany.com',
  
  /** No-reply automated emails */
  NOREPLY: 'noreply@trustlinkcompany.com',
  
  /** Admin notifications recipient */
  ADMIN: 'info@trustlinkcompany.com',
} as const;

/** Company branding for email headers */
export const EMAIL_SENDER = {
  /** Default sender name */
  NAME: 'Trust Link Company',
  
  /** Full sender format for Resend */
  DEFAULT: `Trust Link Company <${EMAIL_CONFIG.PRIMARY}>`,
  SUPPORT: `Trust Link Support <${EMAIL_CONFIG.SUPPORT}>`,
  QUOTES: `Trust Link Quotes <${EMAIL_CONFIG.QUOTES}>`,
  ORDERS: `Trust Link Orders <${EMAIL_CONFIG.ORDERS}>`,
  SECURITY: `Trust Link Security <${EMAIL_CONFIG.SECURITY}>`,
  NOREPLY: `Trust Link Company <${EMAIL_CONFIG.NOREPLY}>`,
} as const;

/** Phone numbers for contact */
export const PHONE_CONFIG = {
  PRIMARY: '+233 30 000 0000',
  SUPPORT: '+233 30 000 0000',
  WHATSAPP: '+233200000000',
} as const;

export type EmailAddress = typeof EMAIL_CONFIG[keyof typeof EMAIL_CONFIG];
