// Common disposable/temporary email domains to block
// This list blocks known spam and temporary email providers
export const DISPOSABLE_EMAIL_DOMAINS = [
  // Popular temporary email services
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'throwaway.email',
  'yopmail.com',
  'maildrop.cc',
  'mintemail.com',
  'sharklasers.com',
  'guerrillamail.info',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'grr.la',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamailblock.com',
  'guerrillamail.net',
  'guerrillamail.org',
  
  // Other temporary services
  'getnada.com',
  'mohmal.com',
  'trashmail.com',
  'fakeinbox.com',
  'temp-mail.ru',
  'dispostable.com',
  'throwawaymail.com',
  'mytemp.email',
  'tmpeml.info',
  'emkei.cf',
];

/**
 * Check if an email domain is from a disposable email provider
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

/**
 * Validate email with disposable check and format validation
 */
export function validateEmail(email: string): { valid: boolean; reason?: string } {
  // Basic format check
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: 'Invalid email format' };
  }
  
  // Length check
  if (email.length < 5 || email.length > 255) {
    return { valid: false, reason: 'Email must be between 5 and 255 characters' };
  }
  
  // Disposable email check
  if (isDisposableEmail(email)) {
    return { valid: false, reason: 'Temporary/disposable email addresses are not allowed' };
  }
  
  return { valid: true };
}
