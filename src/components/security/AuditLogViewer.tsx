import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Shield, 
  Download, 
  Filter, 
  Search, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  Activity,
  TrendingUp,
  Users,
  FileText,
  Clock,
  X,
  FileJson,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { AuditLogger, AuditSeverity } from '@/lib/auditLogger';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { TimeAgo } from '@/components/shared/TimeAgo';
import { motion } from 'framer-motion';

export const AuditLogViewer: React.FC = () => {
  const { user, hasAdminAccess } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | 'all'>('all');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [summary, setSummary] = useState<any[]>([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState<any[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    highSeverityCount: 0,
    failedLogins: 0,
    suspiciousCount: 0
  });

  useEffect(() => {
    loadLogs();
    loadSummary();
    loadSecurityAlerts();
    if (user) {
      loadSuspiciousActivity();
      calculateMetrics();
    }
  }, [user, severityFilter]);

  const loadLogs = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let fetchedLogs;
      if (hasAdminAccess) {
        fetchedLogs = await AuditLogger.getAllLogs(
          severityFilter !== 'all' ? { severity: severityFilter } : undefined,
          100,
          0
        );
      } else {
        fetchedLogs = await AuditLogger.getUserLogs(user.id, 50, 0);
      }
      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Error loading logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    if (!user) return;

    try {
      const summaryData = await AuditLogger.getSummary(
        hasAdminAccess ? undefined : user.id,
        30
      );
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const loadSuspiciousActivity = async () => {
    if (!user) return;

    try {
      const activity = await AuditLogger.detectSuspiciousActivity(user.id, 60);
      setSuspiciousActivity(activity);
    } catch (error) {
      console.error('Error loading suspicious activity:', error);
    }
  };

  const loadSecurityAlerts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setSecurityAlerts(data);
      }
    } catch (error) {
      console.error('Error loading security alerts:', error);
    }
  };

  const calculateMetrics = async () => {
    if (!user) return;

    try {
      const userLogs = hasAdminAccess 
        ? await AuditLogger.getAllLogs(undefined, 1000, 0)
        : await AuditLogger.getUserLogs(user.id, 1000, 0);

      setMetrics({
        totalEvents: userLogs.length,
        highSeverityCount: userLogs.filter(l => l.severity === 'high').length,
        failedLogins: userLogs.filter(l => l.event_type === 'failed_login').length,
        suspiciousCount: userLogs.filter(l => l.event_type === 'suspicious_activity').length
      });
    } catch (error) {
      console.error('Error calculating metrics:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({ 
          acknowledged_at: new Date().toISOString(),
          status: 'acknowledged'
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Alert Acknowledged',
        description: 'The security alert has been acknowledged'
      });

      loadSecurityAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to acknowledge alert',
        variant: 'destructive'
      });
    }
  };

  const handleExport = async () => {
    try {
      const blob = await AuditLogger.exportLogs({
        userId: hasAdminAccess ? undefined : user?.id
      });

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: 'Export Successful',
          description: 'Audit logs have been exported to CSV'
        });
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export audit logs',
        variant: 'destructive'
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const filteredLogs = logs.filter(log =>
    log.event_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{metrics.totalEvents}</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Severity</p>
                <p className="text-2xl font-bold text-destructive">{metrics.highSeverityCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed Logins</p>
                <p className="text-2xl font-bold text-orange-500">{metrics.failedLogins}</p>
              </div>
              <Lock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Suspicious</p>
                <p className="text-2xl font-bold text-orange-500">{metrics.suspiciousCount}</p>
              </div>
              <Eye className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      {securityAlerts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Active Security Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {securityAlerts.map((alert) => (
                <Alert key={alert.id} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{alert.title}</p>
                      <p className="text-sm">{alert.description}</p>
                      <p className="text-xs mt-1">
                        {format(new Date(alert.created_at), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suspicious Activity */}
      {suspiciousActivity.length > 0 && (
        <Card className="border-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-500">
              <Eye className="h-5 w-5" />
              Suspicious Activity Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suspiciousActivity.map((activity, index) => (
                <Alert key={index}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold">{activity.pattern_type.replace(/_/g, ' ')}</p>
                    <p className="text-sm">
                      {activity.occurrences} occurrence(s) - Risk Level: {activity.risk_level}
                    </p>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Audit Logs
              </CardTitle>
              <CardDescription>
                {hasAdminAccess ? 'View all system audit logs' : 'View your account activity'}
              </CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={severityFilter} onValueChange={(value: any) => setSeverityFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Severity</TableHead>
                  {hasAdminAccess && <TableHead>User ID</TableHead>}
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={hasAdminAccess ? 7 : 6} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={hasAdminAccess ? 7 : 6} className="text-center">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.event_type}
                        </code>
                      </TableCell>
                      <TableCell>{log.action || '-'}</TableCell>
                      <TableCell>
                        {log.resource_type ? (
                          <span className="text-xs">
                            {log.resource_type}
                            {log.resource_id && `:${log.resource_id.substring(0, 8)}...`}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(log.severity)} className="flex items-center gap-1 w-fit">
                          {getSeverityIcon(log.severity)}
                          {log.severity}
                        </Badge>
                      </TableCell>
                      {hasAdminAccess && (
                        <TableCell className="font-mono text-xs">
                          {log.user_id ? log.user_id.substring(0, 8) + '...' : '-'}
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-xs">
                        {log.ip_address || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
