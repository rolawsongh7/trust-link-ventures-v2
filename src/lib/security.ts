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