import { z } from 'zod';
import { validatePassword, DEFAULT_PASSWORD_POLICY } from './security';

// Email validation schema with strict format checking
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(255, 'Email must be less than 255 characters')
  .email('Invalid email format')
  .refine(
    (email) => {
      // Additional email validation to prevent injection
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return emailRegex.test(email);
    },
    { message: 'Invalid email format' }
  )
  .refine(
    (email) => {
      // Prevent common disposable email domains (optional but recommended)
      const disposableDomains = ['tempmail.com', 'throwaway.email', '10minutemail.com'];
      const domain = email.split('@')[1]?.toLowerCase();
      return !disposableDomains.includes(domain);
    },
    { message: 'Disposable email addresses are not allowed' }
  );

// Password validation with strength requirements
export const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .refine(
    (password) => {
      const validation = validatePassword(password, DEFAULT_PASSWORD_POLICY);
      return validation.isValid;
    },
    (password) => {
      const validation = validatePassword(password, DEFAULT_PASSWORD_POLICY);
      return { message: validation.errors[0] || 'Password does not meet requirements' };
    }
  );

// Name validation to prevent XSS and injection
const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .refine(
    (name) => {
      // Only allow letters, spaces, hyphens, and apostrophes
      const nameRegex = /^[a-zA-Z\s'-]+$/;
      return nameRegex.test(name);
    },
    { message: 'Name can only contain letters, spaces, hyphens, and apostrophes' }
  )
  .refine(
    (name) => {
      // Prevent potential XSS patterns
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /onerror=/i,
        /onload=/i,
        /<iframe/i,
        /eval\(/i,
      ];
      return !dangerousPatterns.some(pattern => pattern.test(name));
    },
    { message: 'Name contains invalid characters' }
  );

// Company name validation
const companyNameSchema = z
  .string()
  .trim()
  .min(1, 'Company name is required')
  .max(200, 'Company name must be less than 200 characters')
  .refine(
    (name) => {
      // Allow letters, numbers, spaces, and common business characters
      const companyRegex = /^[a-zA-Z0-9\s.,'&()-]+$/;
      return companyRegex.test(name);
    },
    { message: 'Company name contains invalid characters' }
  )
  .refine(
    (name) => {
      // Prevent potential XSS/injection patterns
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /onerror=/i,
        /onload=/i,
        /<iframe/i,
        /eval\(/i,
        /\${/,
      ];
      return !dangerousPatterns.some(pattern => pattern.test(name));
    },
    { message: 'Company name contains invalid characters' }
  );

// Sign in schema
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Sign up schema with all validations
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: nameSchema,
  companyName: companyNameSchema,
});

// Type exports for TypeScript
export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;

// Helper function to sanitize input (defense in depth)
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Validate password strength and return detailed feedback
export function getPasswordStrength(password: string) {
  return validatePassword(password, DEFAULT_PASSWORD_POLICY);
}
