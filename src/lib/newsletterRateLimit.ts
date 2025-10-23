// Client-side rate limiting for newsletter subscriptions
// Note: This is supplemented by server-side IP-based rate limiting in the database

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

const STORAGE_KEY = 'newsletter_rate_limit';
const MAX_ATTEMPTS = 3;
const TIME_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if the user has exceeded the rate limit for newsletter subscriptions
 */
export function checkNewsletterRateLimit(): { allowed: boolean; reason?: string } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    
    if (!stored) {
      // First attempt
      const entry: RateLimitEntry = { count: 1, firstAttempt: now };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
      return { allowed: true };
    }
    
    const entry: RateLimitEntry = JSON.parse(stored);
    const timeElapsed = now - entry.firstAttempt;
    
    // Reset if time window has passed
    if (timeElapsed > TIME_WINDOW_MS) {
      const newEntry: RateLimitEntry = { count: 1, firstAttempt: now };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntry));
      return { allowed: true };
    }
    
    // Check if limit exceeded
    if (entry.count >= MAX_ATTEMPTS) {
      const remainingTime = Math.ceil((TIME_WINDOW_MS - timeElapsed) / 60000);
      return { 
        allowed: false, 
        reason: `Too many subscription attempts. Please try again in ${remainingTime} minutes.` 
      };
    }
    
    // Increment counter
    entry.count++;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    return { allowed: true };
    
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Allow on error to not block legitimate users
    return { allowed: true };
  }
}

/**
 * Reset the rate limit counter (e.g., after successful verification)
 */
export function resetNewsletterRateLimit(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Rate limit reset error:', error);
  }
}
