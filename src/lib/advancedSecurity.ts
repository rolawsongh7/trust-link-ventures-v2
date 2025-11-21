import { supabase } from '@/integrations/supabase/client';
import QRCode from 'qrcode';
import { authenticator } from 'otplib';
import { encode } from 'hi-base32';

// Simple MFA Service without complex OTPAuth dependencies
export class MFAService {
  static generateSecret(): string {
    // Generate a browser-compatible Base32 secret using Web Crypto API
    // TOTP secrets should be 160 bits (20 bytes) minimum per RFC 4226
    const buffer = new Uint8Array(20); // 20 bytes = 160 bits
    crypto.getRandomValues(buffer); // Browser's crypto.getRandomValues
    
    // Use hi-base32 for proper RFC 4648 Base32 encoding
    // false = no padding (standard for TOTP secrets)
    return encode(buffer, false);
  }

  static generateQRCode(userEmail: string, secret: string, issuer: string = 'Trust Link Ventures'): string {
    // Use otplib's built-in keyuri method for proper otpauth URL generation
    return authenticator.keyuri(userEmail, issuer, secret);
  }

  static async generateQRCodeImage(otpUrl: string): Promise<string> {
    try {
      console.log('Generating QR code for URL:', otpUrl.substring(0, 50) + '...');
      const qrDataUrl = await QRCode.toDataURL(otpUrl);
      console.log('QR code generated successfully');
      return qrDataUrl;
    } catch (error) {
      console.error('Error generating QR code image:', error);
      throw new Error('Failed to generate QR code image: ' + (error as Error).message);
    }
  }

  static async verifyToken(userId: string, token: string): Promise<boolean> {
    try {
      // Call edge function for secure server-side verification
      const { data, error } = await supabase.functions.invoke('verify-mfa-token', {
        body: { userId, token }
      });

      if (error) {
        console.error('Error verifying MFA token:', error);
        return false;
      }

      return data?.success || false;
    } catch (error) {
      console.error('Error verifying token:', error);
      return false;
    }
  }

  static async enableMFA(userId: string, secret: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_mfa_settings')
        .upsert({
          user_id: userId,
          enabled: true,
          secret_key: secret,
          updated_at: new Date().toISOString()
        });

      if (!error) {
        await MFAService.logMFAEvent(userId, 'mfa_enabled');
      }

      return !error;
    } catch (error) {
      console.error('Error enabling MFA:', error);
      return false;
    }
  }

  static async disableMFA(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_mfa_settings')
        .update({
          enabled: false,
          secret_key: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (!error) {
        // Delete backup codes
        await supabase
          .from('user_backup_codes')
          .delete()
          .eq('user_id', userId);
        
        await MFAService.logMFAEvent(userId, 'mfa_disabled');
      }

      return !error;
    } catch (error) {
      console.error('Error disabling MFA:', error);
      return false;
    }
  }

  static async getMFASettings(userId: string): Promise<{ enabled: boolean; secret?: string } | null> {
    try {
      const { data, error } = await supabase
        .from('user_mfa_settings')
        .select('enabled, secret_key')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        enabled: data.enabled,
        secret: data.secret_key
      };
    } catch (error) {
      console.error('Error getting MFA settings:', error);
      return null;
    }
  }

  // Generate backup codes (10 codes, 8 characters each)
  static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Array.from(crypto.getRandomValues(new Uint8Array(4)), 
        byte => byte.toString(36).padStart(2, '0')
      ).join('').toUpperCase().substring(0, 8);
      codes.push(code);
    }
    return codes;
  }

  // Hash backup code for storage
  static async hashBackupCode(code: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Store backup codes
  static async storeBackupCodes(userId: string, codes: string[]): Promise<boolean> {
    try {
      const hashedCodes = await Promise.all(
        codes.map(async code => ({
          user_id: userId,
          code_hash: await MFAService.hashBackupCode(code)
        }))
      );

      const { error } = await supabase
        .from('user_backup_codes')
        .insert(hashedCodes);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error storing backup codes:', error);
      return false;
    }
  }

  // Verify backup code
  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const hashedCode = await MFAService.hashBackupCode(code);
      
      const { data, error } = await supabase
        .from('user_backup_codes')
        .select('id')
        .eq('user_id', userId)
        .eq('code_hash', hashedCode)
        .is('used_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) return false;

      // Mark code as used
      await supabase
        .from('user_backup_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', data.id);

      await MFAService.logMFAEvent(userId, 'backup_code_used');
      return true;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return false;
    }
  }

  // Check if MFA attempts are rate limited
  static async checkRateLimit(userId: string): Promise<boolean> {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('mfa_login_attempts')
        .select('id')
        .eq('user_id', userId)
        .eq('success', false)
        .gte('attempt_time', fifteenMinutesAgo);

      if (error) throw error;
      
      return (data?.length || 0) >= 5; // Max 5 failed attempts per 15 minutes
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return false;
    }
  }

  // Log MFA attempt
  static async logMFAAttempt(userId: string, success: boolean): Promise<void> {
    try {
      await supabase
        .from('mfa_login_attempts')
        .insert({
          user_id: userId,
          success,
          ip_address: null,
          user_agent: navigator.userAgent
        });
    } catch (error) {
      console.error('Error logging MFA attempt:', error);
    }
  }

  // Log MFA-related security event
  static async logMFAEvent(userId: string, eventType: string): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          event_type: eventType,
          event_data: { timestamp: new Date().toISOString() },
          severity: 'medium'
        });
    } catch (error) {
      console.error('Error logging MFA event:', error);
    }
  }
}

// Device Fingerprinting Service
export class DeviceFingerprintService {
  static async generateFingerprint(): Promise<string> {
    const components = [];

    // Screen information
    components.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}`);
    
    // Timezone
    components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    
    // Language
    components.push(`lang:${navigator.language}`);
    
    // Platform
    components.push(`platform:${navigator.platform}`);
    
    // User agent (simplified)
    const ua = navigator.userAgent;
    // Simple user agent parsing without external library
    const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/);
    const browser = browserMatch ? browserMatch[0] : 'Unknown';
    components.push(`browser:${browser}`);
    
    // Canvas fingerprinting
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
        components.push(`canvas:${canvas.toDataURL().slice(-100)}`);
      }
    } catch (e) {
      components.push('canvas:blocked');
    }

    // Hardware concurrency
    components.push(`cores:${navigator.hardwareConcurrency || 'unknown'}`);
    
    // Memory (if available)
    if ('memory' in performance) {
      components.push(`memory:${(performance as any).memory.jsHeapSizeLimit}`);
    }

    const fingerprint = components.join('|');
    return this.hashString(fingerprint);
  }

  private static async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static async logDeviceFingerprint(userId?: string): Promise<void> {
    try {
      const fingerprint = await this.generateFingerprint();
      
      const { error } = await supabase
        .from('device_fingerprints')
        .upsert({
          user_id: userId!,
          fingerprint_hash: fingerprint,
          device_info: {
            user_agent: navigator.userAgent,
            screen: `${screen.width}x${screen.height}`,
            language: navigator.language,
            platform: navigator.platform,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          last_seen: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging device fingerprint:', error);
      }
    } catch (error) {
      console.error('Error generating device fingerprint:', error);
    }
  }

  static async getDeviceHistory(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('device_fingerprints')
        .select('*')
        .eq('user_id', userId)
        .order('last_seen', { ascending: false });

      if (error) {
        console.error('Error getting device history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting device history:', error);
      return [];
    }
  }
}

// Anomaly Detection Service
export class AnomalyDetectionService {
  static async detectLoginAnomaly(userId: string, ipAddress: string, userAgent: string): Promise<{
    isAnomalous: boolean;
    reasons: string[];
    riskScore: number;
  }> {
    const reasons: string[] = [];
    let riskScore = 0;

    try {
      // Get user's login history
      const { data: loginHistory } = await supabase
        .from('user_login_history')
        .select('*')
        .eq('user_id', userId)
        .order('login_time', { ascending: false })
        .limit(50);

      if (loginHistory && loginHistory.length > 0) {
        // Check for unusual IP address
        const knownIPs = new Set(loginHistory.map(log => log.ip_address?.toString()).filter(Boolean));
        if (!knownIPs.has(ipAddress)) {
          reasons.push('Unknown IP address');
          riskScore += 30;
        }

        // Check for unusual user agent
        const knownUserAgents = new Set(loginHistory.map(log => log.user_agent).filter(Boolean));
        if (!knownUserAgents.has(userAgent)) {
          reasons.push('Unknown device/browser');
          riskScore += 20;
        }

        // Check for unusual time patterns
        const currentHour = new Date().getHours();
        const recentLogins = loginHistory.slice(0, 10);
        const averageLoginHour = recentLogins.reduce((sum, log) => {
          return sum + new Date(log.login_time).getHours();
        }, 0) / recentLogins.length;

        if (Math.abs(currentHour - averageLoginHour) > 6) {
          reasons.push('Unusual login time');
          riskScore += 15;
        }

        // Check for rapid successive logins
        const lastLogin = loginHistory[0];
        const timeSinceLastLogin = Date.now() - new Date(lastLogin.login_time).getTime();
        if (timeSinceLastLogin < 60000) { // Less than 1 minute
          reasons.push('Rapid successive login attempts');
          riskScore += 25;
        }
      }

      return {
        isAnomalous: riskScore > 40,
        reasons,
        riskScore: Math.min(riskScore, 100)
      };
    } catch (error) {
      console.error('Error detecting login anomaly:', error);
      return { isAnomalous: false, reasons: [], riskScore: 0 };
    }
  }

  static async logSecurityEvent(userId: string, eventType: string, details: any, severity: 'low' | 'medium' | 'high' = 'low'): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_events')
        .insert({
          user_id: userId,
          event_type: eventType,
          details,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging security event:', error);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }
}

// CSRF Protection Service
export class CSRFProtectionService {
  private static tokens = new Map<string, { token: string; expires: number }>();

  static generateToken(sessionId: string): string {
    const token = crypto.randomUUID();
    const expires = Date.now() + (30 * 60 * 1000); // 30 minutes
    
    this.tokens.set(sessionId, { token, expires });
    return token;
  }

  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    
    if (!stored) return false;
    if (stored.expires < Date.now()) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    return stored.token === token;
  }

  static removeToken(sessionId: string): void {
    this.tokens.delete(sessionId);
  }

  static cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, { expires }] of this.tokens.entries()) {
      if (expires < now) {
        this.tokens.delete(sessionId);
      }
    }
  }
}

// Security Headers Service
export class SecurityHeadersService {
  static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': this.getCSPHeader()
    };
  }

  private static getCSPHeader(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "block-all-mixed-content",
      "upgrade-insecure-requests"
    ].join('; ');
  }
}

// Honeypot Service
export class HoneypotService {
  static createHoneypotField(): HTMLInputElement {
    const honeypot = document.createElement('input');
    honeypot.type = 'text';
    honeypot.name = 'website'; // Common honeypot field name
    honeypot.style.position = 'absolute';
    honeypot.style.left = '-9999px';
    honeypot.style.opacity = '0';
    honeypot.style.pointerEvents = 'none';
    honeypot.tabIndex = -1;
    honeypot.autocomplete = 'off';
    return honeypot;
  }

  static validateHoneypot(formData: FormData): boolean {
    const honeypotValue = formData.get('website');
    return !honeypotValue || honeypotValue === '';
  }

  static async logHoneypotTrigger(userId?: string, formType?: string): Promise<void> {
    try {
      await supabase
        .from('security_events')
        .insert({
          user_id: userId!,
          event_type: 'honeypot_triggered',
          details: {
            form_type: formType,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent
          }
        });
    } catch (error) {
      console.error('Error logging honeypot trigger:', error);
    }
  }
}

// Brute Force Protection Service
export class BruteForceProtectionService {
  private static attempts = new Map<string, { count: number; lastAttempt: number; blocked: boolean }>();

  static recordFailedAttempt(identifier: string): boolean {
    const now = Date.now();
    const existing = this.attempts.get(identifier);
    
    if (!existing) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now, blocked: false });
      return false;
    }

    // Reset if more than 15 minutes have passed
    if (now - existing.lastAttempt > 15 * 60 * 1000) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now, blocked: false });
      return false;
    }

    existing.count++;
    existing.lastAttempt = now;

    // Block after 5 failed attempts
    if (existing.count >= 5) {
      existing.blocked = true;
      return true;
    }

    return false;
  }

  static isBlocked(identifier: string): boolean {
    const existing = this.attempts.get(identifier);
    if (!existing) return false;

    // Unblock after 30 minutes
    if (existing.blocked && Date.now() - existing.lastAttempt > 30 * 60 * 1000) {
      this.attempts.delete(identifier);
      return false;
    }

    return existing.blocked;
  }

  static reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  static getRemainingBlockTime(identifier: string): number {
    const existing = this.attempts.get(identifier);
    if (!existing || !existing.blocked) return 0;

    const blockDuration = 30 * 60 * 1000; // 30 minutes
    const elapsed = Date.now() - existing.lastAttempt;
    return Math.max(0, blockDuration - elapsed);
  }

  static async logFailedAttempt(email: string, ipAddress: string, userAgent: string): Promise<void> {
    try {
      await supabase
        .from('failed_login_attempts')
        .insert({
          email,
          ip_address: ipAddress,
          user_agent: userAgent,
          attempt_time: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging failed attempt:', error);
    }
  }
}