import { supabase } from '@/integrations/supabase/client';

interface RateLimitResult {
  allowed: boolean;
  attemptsRemaining: number;
  resetTime?: Date;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;
const LOCKOUT_MINUTES = 30;

// Client-side rate limiter (defense in depth)
class ClientRateLimiter {
  private attempts: Map<string, { count: number; firstAttempt: Date; lockedUntil?: Date }> = new Map();

  check(identifier: string): RateLimitResult {
    const now = new Date();
    const record = this.attempts.get(identifier);

    if (!record) {
      return { allowed: true, attemptsRemaining: MAX_ATTEMPTS };
    }

    // Check if still locked out
    if (record.lockedUntil && now < record.lockedUntil) {
      return {
        allowed: false,
        attemptsRemaining: 0,
        resetTime: record.lockedUntil
      };
    }

    // Check if window has expired
    const windowExpiry = new Date(record.firstAttempt.getTime() + WINDOW_MINUTES * 60000);
    if (now > windowExpiry) {
      // Window expired, reset
      this.attempts.delete(identifier);
      return { allowed: true, attemptsRemaining: MAX_ATTEMPTS };
    }

    // Within window
    const attemptsRemaining = MAX_ATTEMPTS - record.count;
    if (attemptsRemaining <= 0) {
      // Lock out
      const lockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60000);
      this.attempts.set(identifier, { ...record, lockedUntil });
      return {
        allowed: false,
        attemptsRemaining: 0,
        resetTime: lockedUntil
      };
    }

    return {
      allowed: true,
      attemptsRemaining
    };
  }

  record(identifier: string, success: boolean) {
    if (success) {
      // Clear on successful login
      this.attempts.delete(identifier);
      return;
    }

    const now = new Date();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now
      });
    } else {
      this.attempts.set(identifier, {
        ...record,
        count: record.count + 1
      });
    }
  }

  reset(identifier: string) {
    this.attempts.delete(identifier);
  }
}

const clientLimiter = new ClientRateLimiter();

export async function checkAuthRateLimit(email: string): Promise<RateLimitResult> {
  // First check client-side rate limiter (immediate feedback)
  const clientCheck = clientLimiter.check(email);
  if (!clientCheck.allowed) {
    return clientCheck;
  }

  try {
    // Also check server-side failed attempts
    const { data, error } = await supabase.rpc('count_recent_failed_logins', {
      p_identifier: email,
      p_minutes: WINDOW_MINUTES
    });

    if (error) {
      console.error('Error checking rate limit:', error);
      // On error, use client-side check only
      return clientCheck;
    }

    const serverAttempts = data || 0;
    const remainingAttempts = Math.max(0, MAX_ATTEMPTS - serverAttempts);

    if (remainingAttempts === 0) {
      const resetTime = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
      return {
        allowed: false,
        attemptsRemaining: 0,
        resetTime
      };
    }

    return {
      allowed: true,
      attemptsRemaining: Math.min(clientCheck.attemptsRemaining, remainingAttempts)
    };
  } catch (err) {
    console.error('Rate limit check exception:', err);
    // Fallback to client-side check
    return clientCheck;
  }
}

export async function recordAuthAttempt(email: string, success: boolean, reason?: string) {
  // Record in client-side limiter
  clientLimiter.record(email, success);

  // Record failed attempts in database
  if (!success) {
    try {
      await supabase.from('failed_login_attempts').insert({
        email,
        reason: reason || 'Invalid credentials',
        user_agent: navigator.userAgent,
        attempt_time: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error recording failed login:', error);
    }
  }
}

export function resetAuthRateLimit(email: string) {
  clientLimiter.reset(email);
}

export function formatRateLimitMessage(result: RateLimitResult): string {
  if (result.allowed) {
    if (result.attemptsRemaining <= 2) {
      return `Warning: ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? '' : 's'} remaining before lockout.`;
    }
    return '';
  }

  if (result.resetTime) {
    const minutesRemaining = Math.ceil((result.resetTime.getTime() - Date.now()) / 60000);
    return `Too many failed attempts. Please try again in ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'}.`;
  }

  return 'Too many failed attempts. Please try again later.';
}
