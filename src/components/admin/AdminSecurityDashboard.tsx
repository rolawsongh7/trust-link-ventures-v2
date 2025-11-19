import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Lock, AlertTriangle, CheckCircle, Clock, Ban, Activity, Users, XCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MetricCard } from '@/components/shared/MetricCard';
import { TimeAgo } from '@/components/shared/TimeAgo';
import { motion } from 'framer-motion';

interface SecurityMetrics {
  mfaEnabled: boolean;
  recentLogins: number;
  failedAttempts: number;
  suspiciousActivity: number;
  lastLogin?: Date;
  ipWhitelisted: boolean;
}

export const AdminSecurityDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    mfaEnabled: false,
    recentLogins: 0,
    failedAttempts: 0,
    suspiciousActivity: 0,
    ipWhitelisted: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityMetrics();
  }, [user]);

  const loadSecurityMetrics = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Check MFA status
      const { data: mfaSettings } = await supabase
        .from('user_mfa_settings')
        .select('enabled')
        .eq('user_id', user.id)
        .single();

      // Get recent login count (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: logins } = await supabase
        .from('user_login_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('success', true)
        .gte('login_time', sevenDaysAgo.toISOString())
        .order('login_time', { ascending: false });

      // Get failed attempts (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data: failedLogins } = await supabase
        .from('failed_login_attempts')
        .select('*')
        .eq('email', user.email)
        .gte('attempt_time', oneDayAgo.toISOString());

      // Check for suspicious activity
      const { data: securityEvents } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      setMetrics({
        mfaEnabled: mfaSettings?.enabled || false,
        recentLogins: logins?.length || 0,
        failedAttempts: failedLogins?.length || 0,
        suspiciousActivity: securityEvents?.length || 0,
        lastLogin: logins?.[0]?.login_time ? new Date(logins[0].login_time) : undefined,
        ipWhitelisted: false // Will be implemented with IP whitelist feature
      });
    } catch (error) {
      console.error('Error loading security metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSecurityScore = (): number => {
    let score = 0;
    if (metrics.mfaEnabled) score += 40;
    if (metrics.failedAttempts === 0) score += 20;
    if (metrics.suspiciousActivity === 0) score += 20;
    if (metrics.recentLogins > 0 && metrics.recentLogins < 50) score += 20;
    return score;
  };

  const securityScore = getSecurityScore();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Overview
              </CardTitle>
              <CardDescription>
                Your admin account security status
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{securityScore}%</div>
              <div className="text-sm text-muted-foreground">Security Score</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!metrics.mfaEnabled && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                Multi-factor authentication is not enabled. Admin accounts must use MFA for enhanced security.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              {metrics.mfaEnabled ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Ban className="h-5 w-5 text-red-500" />
              )}
              <div className="flex-1">
                <div className="font-medium">Two-Factor Authentication</div>
                <div className="text-sm text-muted-foreground">
                  {metrics.mfaEnabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              <Badge variant={metrics.mfaEnabled ? 'default' : 'destructive'}>
                {metrics.mfaEnabled ? 'Active' : 'Required'}
              </Badge>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Clock className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <div className="font-medium">Last Login</div>
                <div className="text-sm text-muted-foreground">
                  {metrics.lastLogin 
                    ? metrics.lastLogin.toLocaleDateString() 
                    : 'No recent logins'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              {metrics.failedAttempts === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              <div className="flex-1">
                <div className="font-medium">Failed Login Attempts</div>
                <div className="text-sm text-muted-foreground">Last 24 hours</div>
              </div>
              <Badge variant={metrics.failedAttempts === 0 ? 'default' : 'secondary'}>
                {metrics.failedAttempts}
              </Badge>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              {metrics.suspiciousActivity === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <div className="flex-1">
                <div className="font-medium">Security Alerts</div>
                <div className="text-sm text-muted-foreground">Last 7 days</div>
              </div>
              <Badge variant={metrics.suspiciousActivity === 0 ? 'default' : 'destructive'}>
                {metrics.suspiciousActivity}
              </Badge>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Security Recommendations</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {!metrics.mfaEnabled && (
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                  <span>Enable two-factor authentication immediately</span>
                </li>
              )}
              {metrics.failedAttempts > 0 && (
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>Review failed login attempts for suspicious activity</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Use a strong, unique password for your admin account</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Regularly review audit logs for unusual activity</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
