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

// Rate limiting utility
export class RateLimiter {
  private attempts: Map<string, { count: number; windowStart: number }> = new Map();

  isRateLimited(identifier: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const existing = this.attempts.get(identifier);

    if (!existing || now - existing.windowStart > windowMs) {
      // Start new window
      this.attempts.set(identifier, { count: 1, windowStart: now });
      return false;
    }

    // Increment attempts in current window
    existing.count++;
    
    if (existing.count > maxAttempts) {
      return true;
    }

    return false;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  getAttempts(identifier: string): number {
    const existing = this.attempts.get(identifier);
    return existing?.count || 0;
  }
}

// File validation for secure uploads
export interface FileValidationResult {
  valid: boolean;
  errors: string[];
}

export async function validateFileUpload(file: File, userId: string): Promise<FileValidationResult> {
  const errors: string[] = [];

  // File size validation (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File size ${formatBytes(file.size)} exceeds maximum allowed size of ${formatBytes(maxSize)}`);
  }

  // File type validation
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/csv', 'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }

  // File name validation
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar'];
  const fileName = file.name.toLowerCase();
  
  if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
    errors.push(`File extension is not allowed for security reasons`);
  }

  // Check for null bytes and control characters
  if (/[\x00-\x1f\x7f-\x9f]/.test(file.name)) {
    errors.push('File name contains invalid characters');
  }

  // Simulate virus scanning (in production, integrate with real scanner)
  const suspiciousContent = await checkForSuspiciousContent(file);
  if (suspiciousContent.length > 0) {
    errors.push(...suspiciousContent);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

async function checkForSuspiciousContent(file: File): Promise<string[]> {
  const errors: string[] = [];
  
  try {
    // For text files, check content
    if (file.type.startsWith('text/') || file.type === 'application/json') {
      const content = await file.text();
      
      // Check for script tags and suspicious patterns
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i,
        /<iframe/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          errors.push('File contains potentially malicious content');
          break;
        }
      }
    }

    // For images, basic header validation
    if (file.type.startsWith('image/')) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // Check file signatures
      const signatures = {
        'image/jpeg': [0xFF, 0xD8, 0xFF],
        'image/png': [0x89, 0x50, 0x4E, 0x47],
        'image/gif': [0x47, 0x49, 0x46],
        'image/webp': [0x52, 0x49, 0x46, 0x46] // RIFF
      };

      const expectedSig = signatures[file.type as keyof typeof signatures];
      if (expectedSig && bytes.length >= expectedSig.length) {
        const matches = expectedSig.every((byte, index) => bytes[index] === byte);
        if (!matches) {
          errors.push('File signature does not match declared type');
        }
      }
    }
  } catch (error) {
    errors.push('Failed to validate file content');
  }

  return errors;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Security event logging
export async function logSecurityEvent(
  eventType: string, 
  eventData: Record<string, any> = {},
  severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
): Promise<void> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    await supabase
      .from('audit_logs')
      .insert({
        event_type: eventType,
        event_data: eventData,
        severity,
        ip_address: null, // Would need server-side implementation
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// CSP violation reporting
export function setupCSPReporting(): void {
  // Listen for CSP violations
  document.addEventListener('securitypolicyviolation', (event) => {
    const violation = {
      documentURI: event.documentURI,
      violatedDirective: event.violatedDirective,
      blockedURI: event.blockedURI,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber,
      columnNumber: event.columnNumber
    };

    logCSPViolation(violation);
  });

  // Legacy support for older browsers
  window.addEventListener('message', (event) => {
    if (event.data && event.data['csp-report']) {
      logCSPViolation(event.data['csp-report']);
    }
  });
}

async function logCSPViolation(violation: any): Promise<void> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    await supabase
      .from('csp_violations')
      .insert({
        document_uri: violation.documentURI,
        violated_directive: violation.violatedDirective,
        blocked_uri: violation.blockedURI,
        source_file: violation.sourceFile,
        line_number: violation.lineNumber,
        column_number: violation.columnNumber,
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString()
      });

    // Also log as security event
    await logSecurityEvent('csp_violation', violation, 'medium');
  } catch (error) {
    console.error('Failed to log CSP violation:', error);
  }
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