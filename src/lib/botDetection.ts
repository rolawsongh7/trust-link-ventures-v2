// Bot detection utilities for customer portal

export interface BotDetectionResult {
  isBot: boolean;
  confidence: number;
  reasons: string[];
}

/**
 * Honeypot field detection - bots will fill invisible fields
 */
export function checkHoneypot(honeypotValue: string): boolean {
  return honeypotValue.trim().length > 0;
}

/**
 * Detect automated behavior patterns
 */
export function detectAutomatedBehavior(): BotDetectionResult {
  const reasons: string[] = [];
  let score = 0;

  // Check for missing navigator properties (headless browsers)
  if (!navigator.webdriver === undefined) {
    reasons.push('Webdriver detection failed');
    score += 30;
  }

  // Check for webdriver flag
  if (navigator.webdriver) {
    reasons.push('Webdriver detected');
    score += 50;
  }

  // Check for plugins (bots typically have none)
  if (navigator.plugins.length === 0) {
    reasons.push('No browser plugins');
    score += 20;
  }

  // Check for languages
  if (!navigator.languages || navigator.languages.length === 0) {
    reasons.push('No languages configured');
    score += 20;
  }

  // Check for Chrome-specific property in non-Chrome browsers
  const isChrome = /Chrome/.test(navigator.userAgent);
  const hasChrome = !!(window as any).chrome;
  if (!isChrome && hasChrome) {
    reasons.push('Inconsistent browser detection');
    score += 30;
  }

  return {
    isBot: score >= 50,
    confidence: Math.min(score, 100),
    reasons
  };
}

/**
 * Validate reCAPTCHA token with backend
 */
export async function validateRecaptcha(token: string): Promise<boolean> {
  try {
    // In production, this should call your backend to verify the token
    // For now, we just check if token exists
    return token.length > 0;
  } catch (error) {
    console.error('reCAPTCHA validation error:', error);
    return false;
  }
}

/**
 * Check timing patterns (bots fill forms too quickly)
 */
export function checkFormTiming(startTime: number, minSeconds: number = 3): boolean {
  const elapsed = (Date.now() - startTime) / 1000;
  return elapsed >= minSeconds;
}

/**
 * Comprehensive bot check before form submission
 */
export async function performBotCheck(
  recaptchaToken: string | null,
  honeypotValue: string,
  formStartTime: number
): Promise<{ allowed: boolean; reason?: string }> {
  // Check honeypot
  if (checkHoneypot(honeypotValue)) {
    return { allowed: false, reason: 'Honeypot triggered' };
  }

  // Check form timing
  if (!checkFormTiming(formStartTime, 2)) {
    return { allowed: false, reason: 'Form submitted too quickly' };
  }

  // Check automated behavior
  const behaviorCheck = detectAutomatedBehavior();
  if (behaviorCheck.isBot && behaviorCheck.confidence > 70) {
    return { 
      allowed: false, 
      reason: `Bot detected: ${behaviorCheck.reasons.join(', ')}` 
    };
  }

  // Check reCAPTCHA (if enabled)
  if (recaptchaToken) {
    const isValid = await validateRecaptcha(recaptchaToken);
    if (!isValid) {
      return { allowed: false, reason: 'reCAPTCHA verification failed' };
    }
  }

  return { allowed: true };
}
