import { supabase } from '@/integrations/supabase/client';
import * as crypto from 'crypto';

// Utility function to generate secure random strings
const generateSecureRandom = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Simple TOTP implementation for MFA
const generateTOTPSecret = (): string => {
  return generateSecureRandom(16).toUpperCase();
};

const totpTimeSlice = (time: number = Date.now()): number => {
  return Math.floor(time / 30000);
};

const totpGenerate = (secret: string, timeSlice: number): string => {
  const time = timeSlice.toString(16).padStart(16, '0');
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
  hmac.update(Buffer.from(time, 'hex'));
  const digest = hmac.digest();
  
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) |
                 ((digest[offset + 1] & 0xff) << 16) |
                 ((digest[offset + 2] & 0xff) << 8) |
                 (digest[offset + 3] & 0xff);
  
  const otp = (binary % 1000000).toString().padStart(6, '0');
  return otp;
};

// Anomaly Detection Service
export class AnomalyDetectionService {
  static async detectLoginAnomaly(userId: string, ipAddress: string, userAgent: string) {
    try {
      // Get user's login history
      const { data: loginHistory } = await supabase
        .from('user_login_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      const reasons: string[] = [];
      let riskScore = 0;

      // Check for unusual IP address
      const recentIps = loginHistory?.map(login => login.ip_address) || [];
      if (!recentIps.includes(ipAddress)) {
        reasons.push('Login from new IP address');
        riskScore += 30;
      }

      // Check for unusual user agent
      const recentAgents = loginHistory?.map(login => login.user_agent) || [];
      if (!recentAgents.includes(userAgent)) {
        reasons.push('Login from new device/browser');
        riskScore += 25;
      }

      // Check time patterns (simplified)
      const currentHour = new Date().getHours();
      const recentHours = loginHistory?.map(login => new Date(login.created_at).getHours()) || [];
      const isUnusualTime = currentHour < 6 || currentHour > 22;
      const hasRecentSimilarTime = recentHours.some(hour => Math.abs(hour - currentHour) <= 2);
      
      if (isUnusualTime && !hasRecentSimilarTime) {
        reasons.push('Login at unusual time');
        riskScore += 20;
      }

      // Check for rapid successive attempts
      const recentLogins = loginHistory?.filter(login => 
        new Date(login.created_at).getTime() > Date.now() - 5 * 60 * 1000
      ) || [];
      
      if (recentLogins.length > 3) {
        reasons.push('Multiple rapid login attempts');
        riskScore += 40;
      }

      // Log the login attempt
      await supabase
        .from('user_login_history')
        .insert({
          user_id: userId,
          ip_address: ipAddress,
          user_agent: userAgent,
          risk_score: riskScore,
          anomaly_reasons: reasons
        });

      return {
        isAnomalous: riskScore > 40,
        riskScore,
        reasons
      };
    } catch (error) {
      console.error('Error detecting anomaly:', error);
      return {
        isAnomalous: false,
        riskScore: 0,
        reasons: []
      };
    }
  }

  static async logSecurityEvent(userId: string, eventType: string, details: any) {
    try {
      await supabase
        .from('security_events')
        .insert({
          user_id: userId,
          event_type: eventType,
          event_details: details,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }
}

// Device Fingerprinting Service
export class DeviceFingerprintService {
  static async generateFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      navigator.deviceMemory || 'unknown',
      navigator.cookieEnabled ? '1' : '0'
    ];

    // Add canvas fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint test', 2, 2);
      components.push(canvas.toDataURL());
    }

    // Create hash of all components
    const fingerprint = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(components.join('|'))
    );

    return Array.from(new Uint8Array(fingerprint))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async logDeviceFingerprint() {
    try {
      const fingerprint = await this.generateFingerprint();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('device_fingerprints')
          .upsert({
            user_id: user.id,
            fingerprint,
            user_agent: navigator.userAgent,
            last_seen: new Date().toISOString()
          });
      }
      
      return fingerprint;
    } catch (error) {
      console.error('Error logging device fingerprint:', error);
      return null;
    }
  }

  static async getDeviceHistory(userId: string) {
    try {
      const { data } = await supabase
        .from('device_fingerprints')
        .select('*')
        .eq('user_id', userId)
        .order('last_seen', { ascending: false });

      return data || [];
    } catch (error) {
      console.error('Error getting device history:', error);
      return [];
    }
  }
}

// Multi-Factor Authentication Service
export class MFAService {
  static generateSecret(): string {
    return generateTOTPSecret();
  }

  static generateQRCode(email: string, secret: string, issuer: string = 'SeaproSAS'): string {
    const otpUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    return otpUrl;
  }

  static async generateQRCodeImage(otpUrl: string): Promise<string> {
    // Using a QR code service for demonstration
    const encodedUrl = encodeURIComponent(otpUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`;
  }

  static verifyToken(secret: string, token: string): boolean {
    try {
      const timeSlice = totpTimeSlice();
      const expectedToken = totpGenerate(secret, timeSlice);
      const previousToken = totpGenerate(secret, timeSlice - 1);
      
      return token === expectedToken || token === previousToken;
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
          mfa_secret: secret,
          is_enabled: true,
          enabled_at: new Date().toISOString()
        });

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
        .update({ is_enabled: false, disabled_at: new Date().toISOString() })
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Error disabling MFA:', error);
      return false;
    }
  }

  static async getMFAStatus(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('user_mfa_settings')
        .select('is_enabled')
        .eq('user_id', userId)
        .single();

      return data?.is_enabled || false;
    } catch (error) {
      console.error('Error getting MFA status:', error);
      return false;
    }
  }

  static async verifyMFA(userId: string, token: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('user_mfa_settings')
        .select('mfa_secret')
        .eq('user_id', userId)
        .eq('is_enabled', true)
        .single();

      if (!data?.mfa_secret) {
        return false;
      }

      return this.verifyToken(data.mfa_secret, token);
    } catch (error) {
      console.error('Error verifying MFA:', error);
      return false;
    }
  }
}

// Password Security Service
export class PasswordSecurityService {
  static analyzePassword(password: string) {
    const analysis = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      strength: 0
    };

    const checks = [analysis.length, analysis.uppercase, analysis.lowercase, analysis.numbers, analysis.special];
    analysis.strength = (checks.filter(Boolean).length / checks.length) * 100;

    return analysis;
  }

  static async checkBreachedPassword(password: string): Promise<boolean> {
    try {
      // Hash the password using SHA-1
      const hashedPassword = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password));
      const hashArray = Array.from(new Uint8Array(hashedPassword));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      
      const prefix = hashHex.substring(0, 5);
      const suffix = hashHex.substring(5);

      // Check against Have I Been Pwned API
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      const data = await response.text();
      
      return data.includes(suffix);
    } catch (error) {
      console.error('Error checking breached password:', error);
      return false;
    }
  }

  static async logPasswordChange(userId: string) {
    try {
      await supabase
        .from('password_history')
        .insert({
          user_id: userId,
          changed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging password change:', error);
    }
  }
}

// Session Security Service
export class SessionSecurityService {
  static async validateSession(sessionId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .single();

      if (!data) return false;

      // Check if session is expired
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        await this.invalidateSession(sessionId);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }

  static async invalidateSession(sessionId: string) {
    try {
      await supabase
        .from('user_sessions')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('session_id', sessionId);
    } catch (error) {
      console.error('Error invalidating session:', error);
    }
  }

  static async createSession(userId: string, ipAddress: string, userAgent: string) {
    try {
      const sessionId = generateSecureRandom();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await supabase
        .from('user_sessions')
        .insert({
          session_id: sessionId,
          user_id: userId,
          ip_address: ipAddress,
          user_agent: userAgent,
          expires_at: expiresAt.toISOString(),
          is_active: true
        });

      return sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }
}