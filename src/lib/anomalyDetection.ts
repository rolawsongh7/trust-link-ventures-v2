import { supabase } from '@/integrations/supabase/client';
import { AuditLogger } from './auditLogger';

interface LocationData {
  country_name?: string;
  city?: string;
  [key: string]: any;
}

export interface AnomalyDetectionSettings {
  enable_login_pattern_detection: boolean;
  enable_velocity_checks: boolean;
  enable_location_analysis: boolean;
  enable_device_fingerprint_checks: boolean;
  sensitivity_level: 'low' | 'medium' | 'high';
  auto_block_threshold: number;
}

export interface LoginPattern {
  user_id: string;
  typical_login_times: number[];
  typical_locations: string[];
  typical_devices: string[];
  average_session_duration: number;
  login_frequency: number;
}

export interface AnomalyScore {
  total_score: number;
  factors: {
    time_anomaly: number;
    location_anomaly: number;
    device_anomaly: number;
    velocity_anomaly: number;
    behavior_anomaly: number;
  };
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
}

export class AnomalyDetectionService {
  /**
   * Analyze login patterns for a user
   */
  static async analyzeLoginPattern(userId: string): Promise<LoginPattern | null> {
    try {
      const { data: history, error } = await supabase
        .from('user_login_history')
        .select('*')
        .eq('user_id', userId)
        .eq('success', true)
        .order('login_time', { ascending: false })
        .limit(100);

      if (error || !history || history.length === 0) {
        return null;
      }

      // Extract typical login times (hour of day)
      const loginHours = history.map(h => new Date(h.login_time).getHours());
      const typicalLoginTimes = [...new Set(loginHours)];

      // Extract typical locations
      const locations = history
        .map(h => (h.location_data as LocationData)?.country_name)
        .filter(Boolean) as string[];
      const typicalLocations = [...new Set(locations)];

      // Extract typical devices (user agents)
      const devices = history
        .map(h => h.user_agent)
        .filter(Boolean) as string[];
      const typicalDevices = [...new Set(devices)];

      // Calculate average session duration and frequency
      const sessionDurations = history.map((h, i) => {
        if (i < history.length - 1) {
          return new Date(history[i].login_time).getTime() - 
                 new Date(history[i + 1].login_time).getTime();
        }
        return 0;
      }).filter(d => d > 0);

      const avgSessionDuration = sessionDurations.length > 0
        ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
        : 0;

      // Calculate login frequency (logins per day)
      const firstLogin = new Date(history[history.length - 1].login_time);
      const lastLogin = new Date(history[0].login_time);
      const daysDiff = (lastLogin.getTime() - firstLogin.getTime()) / (1000 * 60 * 60 * 24);
      const loginFrequency = history.length / Math.max(daysDiff, 1);

      return {
        user_id: userId,
        typical_login_times: typicalLoginTimes,
        typical_locations: typicalLocations,
        typical_devices: typicalDevices,
        average_session_duration: avgSessionDuration,
        login_frequency: loginFrequency,
      };
    } catch (error) {
      console.error('Error analyzing login pattern:', error);
      return null;
    }
  }

  /**
   * Calculate anomaly score for current login attempt
   */
  static async calculateAnomalyScore(
    userId: string,
    currentIP: string,
    userAgent: string,
    location?: { country_name?: string; city?: string }
  ): Promise<AnomalyScore> {
    const pattern = await this.analyzeLoginPattern(userId);
    const factors = {
      time_anomaly: 0,
      location_anomaly: 0,
      device_anomaly: 0,
      velocity_anomaly: 0,
      behavior_anomaly: 0,
    };
    const reasons: string[] = [];

    if (!pattern) {
      // First login or insufficient data
      return {
        total_score: 0,
        factors,
        risk_level: 'low',
        reasons: ['Insufficient historical data for pattern analysis'],
      };
    }

    // 1. Time anomaly (0-20 points)
    const currentHour = new Date().getHours();
    if (!pattern.typical_login_times.includes(currentHour)) {
      const timeDiff = Math.min(
        ...pattern.typical_login_times.map(h => Math.abs(h - currentHour))
      );
      if (timeDiff > 6) {
        factors.time_anomaly = 20;
        reasons.push(`Unusual login time (${currentHour}:00)`);
      } else if (timeDiff > 3) {
        factors.time_anomaly = 10;
        reasons.push('Login time slightly unusual');
      }
    }

    // 2. Location anomaly (0-30 points)
    if (location?.country_name && !pattern.typical_locations.includes(location.country_name)) {
      factors.location_anomaly = 30;
      reasons.push(`New location detected: ${location.country_name}`);
    }

    // 3. Device anomaly (0-20 points)
    const deviceMatch = pattern.typical_devices.some(device => 
      userAgent.toLowerCase().includes(device.toLowerCase().substring(0, 20))
    );
    if (!deviceMatch) {
      factors.device_anomaly = 20;
      reasons.push('Unrecognized device or browser');
    }

    // 4. Velocity anomaly (0-30 points)
    const velocityScore = await this.checkVelocityAnomaly(userId, location?.country_name);
    factors.velocity_anomaly = velocityScore;
    if (velocityScore > 0) {
      reasons.push('Impossible travel detected');
    }

    // 5. Behavior anomaly (0-20 points)
    const recentFailedAttempts = await this.getRecentFailedAttempts(userId);
    if (recentFailedAttempts > 3) {
      factors.behavior_anomaly = 20;
      reasons.push(`${recentFailedAttempts} recent failed login attempts`);
    } else if (recentFailedAttempts > 0) {
      factors.behavior_anomaly = 10;
    }

    const totalScore = Object.values(factors).reduce((a, b) => a + b, 0);
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (totalScore >= 70) riskLevel = 'critical';
    else if (totalScore >= 50) riskLevel = 'high';
    else if (totalScore >= 30) riskLevel = 'medium';

    return {
      total_score: totalScore,
      factors,
      risk_level: riskLevel,
      reasons,
    };
  }

  /**
   * Check for velocity anomaly (impossible travel)
   */
  static async checkVelocityAnomaly(userId: string, currentLocation?: string): Promise<number> {
    if (!currentLocation) return 0;

    try {
      const { data: lastLogin } = await supabase
        .from('user_login_history')
        .select('login_time, location_data')
        .eq('user_id', userId)
        .eq('success', true)
        .order('login_time', { ascending: false })
        .limit(1)
        .single();

      if (!lastLogin) return 0;

      const timeDiff = Date.now() - new Date(lastLogin.login_time).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      const lastLocationData = lastLogin.location_data as LocationData;

      // If less than 2 hours and different country, flag as suspicious
      if (hoursDiff < 2 && 
          lastLocationData?.country_name && 
          lastLocationData.country_name !== currentLocation) {
        return 30;
      }

      // If less than 30 minutes and different city, flag as suspicious
      if (hoursDiff < 0.5 && 
          lastLocationData?.city && 
          lastLocationData.city !== currentLocation) {
        return 15;
      }

      return 0;
    } catch (error) {
      console.error('Error checking velocity anomaly:', error);
      return 0;
    }
  }

  /**
   * Get recent failed login attempts
   */
  static async getRecentFailedAttempts(userId: string): Promise<number> {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('user_login_history')
        .select('id')
        .eq('user_id', userId)
        .eq('success', false)
        .gte('login_time', fifteenMinutesAgo);

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Error getting failed attempts:', error);
      return 0;
    }
  }

  /**
   * Get anomaly detection settings for user
   */
  static async getSettings(userId: string): Promise<AnomalyDetectionSettings | null> {
    try {
      const { data, error } = await supabase
        .from('anomaly_detection_settings')
        .select('enable_login_pattern_detection, enable_velocity_checks, enable_location_analysis, enable_device_fingerprint_checks, sensitivity_level, auto_block_threshold')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
        return null;
      }

      return data as AnomalyDetectionSettings | null;
    } catch (error) {
      console.error('Error fetching anomaly detection settings:', error);
      return null;
    }
  }

  /**
   * Update anomaly detection settings
   */
  static async updateSettings(
    userId: string,
    settings: Partial<AnomalyDetectionSettings>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('anomaly_detection_settings')
        .upsert({
          user_id: userId,
          enable_login_pattern_detection: settings.enable_login_pattern_detection,
          enable_velocity_checks: settings.enable_velocity_checks,
          enable_location_analysis: settings.enable_location_analysis,
          enable_device_fingerprint_checks: settings.enable_device_fingerprint_checks,
          sensitivity_level: settings.sensitivity_level,
          auto_block_threshold: settings.auto_block_threshold,
          updated_at: new Date().toISOString(),
        } as any);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating anomaly detection settings:', error);
      return false;
    }
  }

  /**
   * Create security alert for detected anomaly
   */
  static async createSecurityAlert(
    userId: string,
    anomalyScore: AnomalyScore,
    context: any
  ): Promise<void> {
    try {
      await supabase.from('security_alerts').insert({
        user_id: userId,
        alert_type: 'anomaly_detected',
        severity: anomalyScore.risk_level,
        title: `Unusual login activity detected (${anomalyScore.risk_level} risk)`,
        description: `Anomaly score: ${anomalyScore.total_score}/100. ${anomalyScore.reasons.join(', ')}`,
        metadata: {
          anomaly_score: anomalyScore,
          context,
        } as any,
        status: 'active',
      } as any);

      await AuditLogger.logSecurity(
        'anomaly_detected',
        userId,
        {
          anomaly_score: anomalyScore.total_score,
          risk_level: anomalyScore.risk_level,
          reasons: anomalyScore.reasons,
          ...context,
        },
        anomalyScore.risk_level === 'critical' ? 'high' : 'medium'
      );
    } catch (error) {
      console.error('Error creating security alert:', error);
    }
  }

  /**
   * Check if login should be blocked based on anomaly score
   */
  static async shouldBlockLogin(
    userId: string,
    anomalyScore: AnomalyScore
  ): Promise<{ blocked: boolean; reason?: string }> {
    const settings = await this.getSettings(userId);
    
    if (!settings) {
      return { blocked: false };
    }

    // Determine threshold based on sensitivity
    let threshold = settings.auto_block_threshold;
    if (settings.sensitivity_level === 'high') {
      threshold = Math.max(threshold - 20, 30);
    } else if (settings.sensitivity_level === 'low') {
      threshold = Math.min(threshold + 20, 90);
    }

    if (anomalyScore.total_score >= threshold) {
      return {
        blocked: true,
        reason: `Login blocked due to high anomaly score (${anomalyScore.total_score}). ${anomalyScore.reasons.join(', ')}`,
      };
    }

    return { blocked: false };
  }

  /**
   * Record login attempt with anomaly data
   */
  static async recordLoginAttempt(
    userId: string,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    locationData: any,
    riskScore: number
  ): Promise<void> {
    try {
      await supabase.from('user_login_history').insert({
        user_id: userId,
        success,
        ip_address: ipAddress,
        user_agent: userAgent,
        location_data: locationData,
        risk_score: riskScore,
      });
    } catch (error) {
      console.error('Error recording login attempt:', error);
    }
  }
}
