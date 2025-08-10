// Password validation and security utilities

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAgeDays?: number;
  preventReuseCount?: number;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAgeDays: 90,
  preventReuseCount: 5
};

export interface PasswordValidation {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
  score: number;
}

export function validatePassword(password: string, policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY): PasswordValidation {
  const errors: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
  } else {
    score += 1;
  }

  // Check uppercase requirement
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (policy.requireUppercase) {
    score += 1;
  }

  // Check lowercase requirement
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (policy.requireLowercase) {
    score += 1;
  }

  // Check numbers requirement
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (policy.requireNumbers) {
    score += 1;
  }

  // Check special characters requirement
  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else if (policy.requireSpecialChars) {
    score += 1;
  }

  // Additional scoring for length
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';

  return {
    isValid: errors.length === 0,
    strength,
    errors,
    score
  };
}

export function generateSecurePassword(length: number = 16, policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY): string {
  const characters = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  let password = '';
  let allChars = '';

  // Ensure at least one character from each required category
  if (policy.requireUppercase) {
    password += characters.uppercase.charAt(Math.floor(Math.random() * characters.uppercase.length));
    allChars += characters.uppercase;
  }
  if (policy.requireLowercase) {
    password += characters.lowercase.charAt(Math.floor(Math.random() * characters.lowercase.length));
    allChars += characters.lowercase;
  }
  if (policy.requireNumbers) {
    password += characters.numbers.charAt(Math.floor(Math.random() * characters.numbers.length));
    allChars += characters.numbers;
  }
  if (policy.requireSpecialChars) {
    password += characters.special.charAt(Math.floor(Math.random() * characters.special.length));
    allChars += characters.special;
  }

  // Fill remaining length with random characters
  while (password.length < length) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Rate limiting implementation
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  isRateLimited(identifier: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    // Clean up expired entries
    if (attempt && now > attempt.resetTime) {
      this.attempts.delete(identifier);
    }

    const currentAttempt = this.attempts.get(identifier);

    if (!currentAttempt) {
      this.attempts.set(identifier, { count: 1, resetTime: now + windowMs });
      return false;
    }

    if (currentAttempt.count >= maxAttempts) {
      return true;
    }

    currentAttempt.count++;
    return false;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, attempt] of this.attempts.entries()) {
      if (now > attempt.resetTime) {
        this.attempts.delete(key);
      }
    }
  }
}

// CSP Reporting setup
export function setupCSPReporting(): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('securitypolicyviolation', (event) => {
      logSecurityEvent('csp_violation', {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        documentURI: event.documentURI,
        lineNumber: event.lineNumber,
        sourceFile: event.sourceFile
      }, 'medium');
    });
  }
}

// Security event logging
export async function logSecurityEvent(
  eventType: string, 
  eventData?: Record<string, any>, 
  severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
): Promise<void> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    await supabase.from('security_events').insert({
      event_type: eventType,
      details: eventData || {},
      user_id: eventData?.userId || null,
      ip_address: null, // Would need to be passed from client
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// File upload validation
export async function validateFileUpload(
  file: File, 
  userId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Basic file validation
  if (file.size > 10 * 1024 * 1024) {
    errors.push('File size exceeds 10MB limit');
  }

  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf', 'text/csv', 'text/plain'
  ];

  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }

  // Check file name for suspicious patterns
  const suspiciousPatterns = [
    /\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.scr$/i,
    /\.php$/i, /\.asp$/i, /\.jsp$/i
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
    errors.push('File type appears to be executable and is not allowed');
  }

  // Log file upload attempt
  await logSecurityEvent('file_upload_validation', {
    userId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    valid: errors.length === 0
  }, errors.length > 0 ? 'medium' : 'low');

  return {
    valid: errors.length === 0,
    errors
  };
}