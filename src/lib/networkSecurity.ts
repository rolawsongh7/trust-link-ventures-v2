import { supabase } from '@/integrations/supabase/client';

export interface NetworkSecuritySettings {
  block_vpn: boolean;
  block_tor: boolean;
  enable_geo_blocking: boolean;
  risk_threshold: number;
}

export interface IPWhitelistEntry {
  id: string;
  ip_address: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface NetworkRiskAssessment {
  risk_score: number;
  is_vpn: boolean;
  is_tor: boolean;
  is_proxy: boolean;
  country_code?: string;
  country_name?: string;
  blocked: boolean;
  reason?: string;
}

export class NetworkSecurityService {
  /**
   * Get current user's IP address
   */
  static async getCurrentIP(): Promise<string | null> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting IP address:', error);
      return null;
    }
  }

  /**
   * Get IP geolocation and threat intelligence
   */
  static async getIPIntelligence(ipAddress: string): Promise<NetworkRiskAssessment> {
    try {
      // Using ipapi.co for geolocation (free tier: 1000 requests/day)
      const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
      const data = await response.json();

      // Calculate risk score based on various factors
      let riskScore = 0;
      
      // Check for VPN/Proxy/Tor indicators
      const isVpn = data.asn?.includes('VPN') || data.org?.toLowerCase().includes('vpn');
      const isProxy = data.asn?.includes('Proxy') || data.org?.toLowerCase().includes('proxy');
      const isTor = data.asn?.includes('Tor') || data.org?.toLowerCase().includes('tor');

      if (isVpn) riskScore += 30;
      if (isProxy) riskScore += 40;
      if (isTor) riskScore += 50;

      // Check for data center/hosting provider
      if (data.asn?.toLowerCase().includes('hosting') || 
          data.org?.toLowerCase().includes('digital ocean') ||
          data.org?.toLowerCase().includes('amazon') ||
          data.org?.toLowerCase().includes('google cloud')) {
        riskScore += 20;
      }

      return {
        risk_score: Math.min(riskScore, 100),
        is_vpn: isVpn || false,
        is_tor: isTor || false,
        is_proxy: isProxy || false,
        country_code: data.country_code,
        country_name: data.country_name,
        blocked: false
      };
    } catch (error) {
      console.error('Error getting IP intelligence:', error);
      return {
        risk_score: 0,
        is_vpn: false,
        is_tor: false,
        is_proxy: false,
        blocked: false
      };
    }
  }

  /**
   * Check if IP is whitelisted for user
   */
  static async isIPWhitelisted(userId: string, ipAddress: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('ip_whitelist')
        .select('id')
        .eq('user_id', userId)
        .eq('ip_address', ipAddress)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking IP whitelist:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking IP whitelist:', error);
      return false;
    }
  }

  /**
   * Get user's network security settings
   */
  static async getSecuritySettings(userId: string): Promise<NetworkSecuritySettings | null> {
    try {
      const { data, error } = await supabase
        .from('network_security_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching security settings:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error fetching security settings:', error);
      return null;
    }
  }

  /**
   * Update user's network security settings
   */
  static async updateSecuritySettings(
    userId: string,
    settings: Partial<NetworkSecuritySettings>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('network_security_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating security settings:', error);
      return false;
    }
  }

  /**
   * Validate network access based on security settings
   */
  static async validateNetworkAccess(
    userId: string,
    ipAddress: string
  ): Promise<NetworkRiskAssessment> {
    try {
      // Get security settings
      const settings = await this.getSecuritySettings(userId);
      
      // If no settings, allow access with basic check
      if (!settings) {
        const intelligence = await this.getIPIntelligence(ipAddress);
        return { ...intelligence, blocked: false };
      }

      // Check if IP is whitelisted
      const isWhitelisted = await this.isIPWhitelisted(userId, ipAddress);
      if (isWhitelisted) {
        return {
          risk_score: 0,
          is_vpn: false,
          is_tor: false,
          is_proxy: false,
          blocked: false,
          reason: 'IP is whitelisted'
        };
      }

      // Get IP intelligence
      const intelligence = await this.getIPIntelligence(ipAddress);

      // Apply security rules
      let blocked = false;
      let reason = '';

      if (settings.block_tor && intelligence.is_tor) {
        blocked = true;
        reason = 'Tor exit nodes are blocked';
      } else if (settings.block_vpn && intelligence.is_vpn) {
        blocked = true;
        reason = 'VPN connections are blocked';
      } else if (intelligence.risk_score > settings.risk_threshold) {
        blocked = true;
        reason = `Risk score (${intelligence.risk_score}) exceeds threshold (${settings.risk_threshold})`;
      }

      return {
        ...intelligence,
        blocked,
        reason
      };
    } catch (error) {
      console.error('Error validating network access:', error);
      return {
        risk_score: 0,
        is_vpn: false,
        is_tor: false,
        is_proxy: false,
        blocked: false
      };
    }
  }

  /**
   * Add IP to whitelist
   */
  static async addIPToWhitelist(
    userId: string,
    ipAddress: string,
    description: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ip_whitelist')
        .insert({
          user_id: userId,
          ip_address: ipAddress,
          description,
          is_active: true
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding IP to whitelist:', error);
      return false;
    }
  }

  /**
   * Remove IP from whitelist
   */
  static async removeIPFromWhitelist(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ip_whitelist')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing IP from whitelist:', error);
      return false;
    }
  }

  /**
   * Get user's IP whitelist
   */
  static async getIPWhitelist(userId: string): Promise<IPWhitelistEntry[]> {
    try {
      const { data, error } = await supabase
        .from('ip_whitelist')
        .select('id, ip_address, description, is_active, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as IPWhitelistEntry[];
    } catch (error) {
      console.error('Error fetching IP whitelist:', error);
      return [];
    }
  }

  /**
   * Toggle IP whitelist entry status
   */
  static async toggleIPStatus(id: string, isActive: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ip_whitelist')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error toggling IP status:', error);
      return false;
    }
  }
}
