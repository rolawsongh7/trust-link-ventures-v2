import { supabase } from '@/integrations/supabase/client';

export type AuditEventType = 
  | 'user_login'
  | 'user_logout'
  | 'user_signup'
  | 'password_reset'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'mfa_verified'
  | 'failed_login'
  | 'unauthorized_access'
  | 'data_create'
  | 'data_update'
  | 'data_delete'
  | 'data_export'
  | 'settings_changed'
  | 'role_changed'
  | 'permission_granted'
  | 'permission_revoked'
  | 'file_uploaded'
  | 'file_downloaded'
  | 'api_access'
  | 'suspicious_activity';

export type AuditSeverity = 'low' | 'medium' | 'high';

export interface AuditLogOptions {
  userId?: string;
  eventType: AuditEventType;
  action: string;
  resourceType?: string;
  resourceId?: string;
  eventData?: Record<string, any>;
  changes?: {
    before?: any;
    after?: any;
  };
  ipAddress?: string;
  userAgent?: string;
  severity?: AuditSeverity;
  sessionId?: string;
  requestId?: string;
}

export class AuditLogger {
  /**
   * Log an audit event
   */
  static async log(options: AuditLogOptions): Promise<void> {
    try {
      const {
        userId,
        eventType,
        action,
        resourceType,
        resourceId,
        eventData = {},
        changes,
        ipAddress,
        userAgent = navigator.userAgent,
        severity = 'low',
        sessionId,
        requestId
      } = options;

      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          event_type: eventType,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          event_data: eventData,
          changes,
          ip_address: ipAddress,
          user_agent: userAgent,
          severity,
          session_id: sessionId,
          request_id: requestId
        });

      if (error) {
        console.error('Failed to create audit log:', error);
      }
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  /**
   * Log authentication event
   */
  static async logAuth(
    eventType: 'user_login' | 'user_logout' | 'user_signup' | 'failed_login',
    userId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      eventType,
      action: eventType.replace('_', ' '),
      eventData: details,
      severity: eventType === 'failed_login' ? 'medium' : 'low'
    });
  }

  /**
   * Log data modification
   */
  static async logDataChange(
    action: 'create' | 'update' | 'delete',
    resourceType: string,
    resourceId: string,
    userId?: string,
    changes?: { before?: any; after?: any }
  ): Promise<void> {
    await this.log({
      userId,
      eventType: `data_${action}` as AuditEventType,
      action: `${action} ${resourceType}`,
      resourceType,
      resourceId,
      changes,
      severity: action === 'delete' ? 'medium' : 'low'
    });
  }

  /**
   * Log security event
   */
  static async logSecurity(
    eventType: AuditEventType,
    userId: string,
    details: Record<string, any>,
    severity: AuditSeverity = 'high'
  ): Promise<void> {
    await this.log({
      userId,
      eventType,
      action: eventType.replace('_', ' '),
      eventData: details,
      severity
    });
  }

  /**
   * Log system event
   */
  static async logSystem(
    eventType: string,
    message: string,
    details?: Record<string, any>,
    severity: 'info' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_events')
        .insert({
          event_type: eventType,
          severity,
          message,
          details: details || {},
          source: 'web-app'
        });

      if (error) {
        console.error('Failed to log system event:', error);
      }
    } catch (error) {
      console.error('Error logging system event:', error);
    }
  }

  /**
   * Get audit logs for a user
   */
  static async getUserLogs(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Failed to fetch audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }

  /**
   * Get all audit logs (admin only)
   */
  static async getAllLogs(
    filters?: {
      eventType?: string;
      severity?: AuditSeverity;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType);
      }

      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      const { data, error } = await query.range(offset, offset + limit - 1);

      if (error) {
        console.error('Failed to fetch audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit summary
   */
  static async getSummary(
    userId?: string,
    days: number = 30
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_audit_summary', {
          p_user_id: userId || null,
          p_days: days
        });

      if (error) {
        console.error('Failed to fetch audit summary:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching audit summary:', error);
      return [];
    }
  }

  /**
   * Detect suspicious activity
   */
  static async detectSuspiciousActivity(
    userId: string,
    timeWindow: number = 15
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('detect_suspicious_activity', {
          p_user_id: userId,
          p_time_window: timeWindow
        });

      if (error) {
        console.error('Failed to detect suspicious activity:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
      return [];
    }
  }

  /**
   * Export audit logs
   */
  static async exportLogs(
    filters?: {
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Blob | null> {
    try {
      const logs = await this.getAllLogs(filters, 10000, 0);
      
      const csv = [
        ['Timestamp', 'User ID', 'Event Type', 'Action', 'Resource', 'Severity', 'IP Address'].join(','),
        ...logs.map(log => [
          log.created_at,
          log.user_id || '',
          log.event_type,
          log.action || '',
          log.resource_type ? `${log.resource_type}:${log.resource_id}` : '',
          log.severity,
          log.ip_address || ''
        ].join(','))
      ].join('\n');

      return new Blob([csv], { type: 'text/csv' });
    } catch (error) {
      console.error('Error exporting logs:', error);
      return null;
    }
  }
}
