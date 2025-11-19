import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Lock,
  Users,
  TrendingUp,
  Clock,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { AuditLogger } from '@/lib/auditLogger';
import { MetricCard } from '@/components/shared/MetricCard';
import { TimeAgo } from '@/components/shared/TimeAgo';
import { motion } from 'framer-motion';

interface SecurityMetrics {
  systemHealth: number;
  activeUsers: number;
  securityScore: number;
  recentIncidents: number;
  blockedAttempts: number;
  mfaAdoption: number;
}

export const SecurityMonitoring: React.FC = () => {
  const { user, hasAdminAccess } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    systemHealth: 98,
    activeUsers: 0,
    securityScore: 85,
    recentIncidents: 0,
    blockedAttempts: 0,
    mfaAdoption: 0
  });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [securityTrends, setSecurityTrends] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      
      // Refresh every 30 seconds
      const interval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMetrics(),
        loadRecentEvents(),
        loadSecurityTrends()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    if (!user) return;

    try {
      // Get recent login attempts
      const { data: loginAttempts } = await supabase
        .from('user_login_history')
        .select('*')
        .gte('login_time', subDays(new Date(), 7).toISOString());

      // Get MFA settings
      const { data: mfaUsers } = await supabase
        .from('user_mfa_settings')
        .select('enabled');

      // Get failed attempts
      const { data: failedAttempts } = await supabase
        .from('failed_login_attempts')
        .select('*')
        .gte('attempt_time', subDays(new Date(), 1).toISOString());

      // Get security alerts
      const { data: alerts } = await supabase
        .from('security_alerts')
        .select('*')
        .eq('status', 'active')
        .gte('created_at', subDays(new Date(), 7).toISOString());

      const totalMfa = mfaUsers?.length || 0;
      const enabledMfa = mfaUsers?.filter(u => u.enabled).length || 0;
      const mfaRate = totalMfa > 0 ? Math.round((enabledMfa / totalMfa) * 100) : 0;

      const successfulLogins = loginAttempts?.filter(l => l.success).length || 0;
      const totalLogins = loginAttempts?.length || 0;
      const successRate = totalLogins > 0 ? Math.round((successfulLogins / totalLogins) * 100) : 100;

      setMetrics({
        systemHealth: successRate,
        activeUsers: loginAttempts?.filter(l => 
          new Date(l.login_time) > subDays(new Date(), 1)
        ).length || 0,
        securityScore: Math.round((successRate + mfaRate) / 2),
        recentIncidents: alerts?.length || 0,
        blockedAttempts: failedAttempts?.length || 0,
        mfaAdoption: mfaRate
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const loadRecentEvents = async () => {
    if (!user) return;

    try {
      const events = hasAdminAccess
        ? await AuditLogger.getAllLogs(undefined, 20, 0)
        : await AuditLogger.getUserLogs(user.id, 20, 0);
      
      setRecentEvents(events);
    } catch (error) {
      console.error('Error loading recent events:', error);
    }
  };

  const loadSecurityTrends = async () => {
    if (!user) return;

    try {
      const summary = await AuditLogger.getSummary(
        hasAdminAccess ? undefined : user.id,
        7
      );
      setSecurityTrends(summary);
    } catch (error) {
      console.error('Error loading security trends:', error);
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-500';
    if (health >= 70) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getHealthStatus = (health: number) => {
    if (health >= 90) return 'Excellent';
    if (health >= 70) return 'Good';
    if (health >= 50) return 'Fair';
    return 'Critical';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading security dashboard...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-3xl font-bold ${getHealthColor(metrics.systemHealth)}`}>
                {metrics.systemHealth}%
              </div>
              <Server className={`h-8 w-8 ${getHealthColor(metrics.systemHealth)}`} />
            </div>
            <Progress value={metrics.systemHealth} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              Status: {getHealthStatus(metrics.systemHealth)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Security Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-3xl font-bold ${getHealthColor(metrics.securityScore)}`}>
                {metrics.securityScore}
              </div>
              <Shield className={`h-8 w-8 ${getHealthColor(metrics.securityScore)}`} />
            </div>
            <Progress value={metrics.securityScore} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              Overall security posture
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MFA Adoption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-3xl font-bold ${getHealthColor(metrics.mfaAdoption)}`}>
                {metrics.mfaAdoption}%
              </div>
              <Lock className={`h-8 w-8 ${getHealthColor(metrics.mfaAdoption)}`} />
            </div>
            <Progress value={metrics.mfaAdoption} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              Users with 2FA enabled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users (24h)</p>
                <p className="text-2xl font-bold">{metrics.activeUsers}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Blocked Attempts</p>
                <p className="text-2xl font-bold text-destructive">{metrics.blockedAttempts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Security Incidents</p>
                <p className="text-2xl font-bold text-orange-500">{metrics.recentIncidents}</p>
              </div>
              <Eye className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity and Trends */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="trends">Security Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Security Events
              </CardTitle>
              <CardDescription>
                Latest security-related activities and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEvents.slice(0, 10).map((event) => (
                  <div key={event.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                    <div className={`mt-1 ${
                      event.severity === 'high' ? 'text-destructive' :
                      event.severity === 'medium' ? 'text-orange-500' :
                      'text-muted-foreground'
                    }`}>
                      {event.severity === 'high' ? <AlertTriangle className="h-5 w-5" /> :
                       event.severity === 'medium' ? <Eye className="h-5 w-5" /> :
                       <Activity className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{event.action || event.event_type}</p>
                        <Badge variant={
                          event.severity === 'high' ? 'destructive' :
                          event.severity === 'medium' ? 'default' :
                          'secondary'
                        }>
                          {event.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {event.resource_type && `${event.resource_type} • `}
                        {format(new Date(event.created_at), 'MMM d, yyyy HH:mm:ss')}
                      </p>
                      {event.ip_address && (
                        <p className="text-xs text-muted-foreground font-mono">
                          IP: {event.ip_address}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Security Trends (Last 7 Days)
              </CardTitle>
              <CardDescription>
                Event patterns and frequency over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityTrends.map((trend, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {trend.event_type.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last occurrence: {format(new Date(trend.last_occurrence), 'MMM d, HH:mm')}
                        </p>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {trend.count} events
                      </Badge>
                    </div>
                    <Progress 
                      value={Math.min((trend.count / Math.max(...securityTrends.map(t => t.count))) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                ))}
                {securityTrends.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No significant security events in the last 7 days</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Last Updated */}
      <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
        <Clock className="h-3 w-3" />
        Last updated: {format(new Date(), 'MMM d, yyyy HH:mm:ss')}
      </div>
    </div>
  );
};