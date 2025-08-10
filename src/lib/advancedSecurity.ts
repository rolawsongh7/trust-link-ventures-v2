import { supabase } from '@/integrations/supabase/client';

// Simplified services for browser compatibility

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
      (navigator as any).deviceMemory || 'unknown',
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

    // Create simple hash of all components
    const data = components.join('|');
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
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
            fingerprint_hash: fingerprint,
            device_info: { userAgent: navigator.userAgent },
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
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
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
    // Simplified verification for demo purposes
    return token.length === 6 && /^\d+$/.test(token);
  }

  static async enableMFA(userId: string, secret: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_mfa_settings')
        .upsert({
          user_id: userId,
          secret_key: secret,
          enabled: true,
          updated_at: new Date().toISOString()
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
        .update({ enabled: false, updated_at: new Date().toISOString() })
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
        .select('enabled')
        .eq('user_id', userId)
        .single();

      return data?.enabled || false;
    } catch (error) {
      console.error('Error getting MFA status:', error);
      return false;
    }
  }

  static async verifyMFA(userId: string, token: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('user_mfa_settings')
        .select('secret_key')
        .eq('user_id', userId)
        .eq('enabled', true)
        .single();

      if (!data?.secret_key) {
        return false;
      }

      return this.verifyToken(data.secret_key, token);
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
    // Simplified check against common passwords
    const commonPasswords = ['password', '123456', 'password123', 'admin', 'qwerty'];
    return commonPasswords.includes(password.toLowerCase());
  }

  static async logPasswordChange(userId: string) {
    try {
      await supabase
        .from('password_history')
        .insert({
          user_id: userId,
          password_hash: 'hashed',
          strength_score: 3
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
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
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