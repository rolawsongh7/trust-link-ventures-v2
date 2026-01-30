import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  RefreshCw,
  Download,
  Filter,
  Calendar,
  AlertTriangle,
  Info,
  AlertCircle,
  Crown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  event_type: string;
  action: string;
  severity: string;
  event_data: any;
  created_at: string;
  user_id: string;
  resource_type: string;
  resource_id: string;
  ip_address: string;
  user_role: string;
}

interface ExtendedAuditResult {
  success: boolean;
  is_super_admin: boolean;
  logs: AuditLog[];
  total_count: number;
  limit: number;
  offset: number;
}

export const ExtendedAuditLogCard = () => {
  const { hasSuperAdminAccess, hasAdminAccess } = useRoleAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Filters
  const [severity, setSeverity] = useState<string>('');
  const [eventType, setEventType] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  useEffect(() => {
    if (hasAdminAccess) {
      fetchLogs();
    }
  }, [hasAdminAccess, severity, eventType, userRole, startDate, endDate, offset]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = {
        p_limit: limit,
        p_offset: offset
      };
      
      if (severity) params.p_severity = severity;
      if (eventType) params.p_event_type = eventType;
      if (userRole && hasSuperAdminAccess) params.p_user_role = userRole;
      if (startDate) params.p_start_date = new Date(startDate).toISOString();
      if (endDate) params.p_end_date = new Date(endDate).toISOString();

      const { data, error } = await supabase.rpc('get_extended_audit_logs', params);
      
      if (error) throw error;
      
      const result = data as unknown as ExtendedAuditResult;
      setLogs(result.logs || []);
      setTotalCount(result.total_count);
      setIsSuperAdmin(result.is_super_admin);
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      // Fetch all logs for export
      const params: any = { p_limit: 10000, p_offset: 0 };
      if (severity) params.p_severity = severity;
      if (eventType) params.p_event_type = eventType;
      if (userRole && hasSuperAdminAccess) params.p_user_role = userRole;
      if (startDate) params.p_start_date = new Date(startDate).toISOString();
      if (endDate) params.p_end_date = new Date(endDate).toISOString();

      const { data, error } = await supabase.rpc('get_extended_audit_logs', params);
      if (error) throw error;
      
      const result = data as unknown as ExtendedAuditResult;
      
      const exportData = {
        exported_at: new Date().toISOString(),
        filters: { severity, eventType, userRole, startDate, endDate },
        total_records: result.total_count,
        logs: result.logs
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Complete',
        description: `Exported ${result.logs?.length || 0} audit log entries.`,
      });
    } catch (error: any) {
      console.error('Failed to export logs:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export audit logs',
        variant: 'destructive',
      });
    }
  };

  const clearFilters = () => {
    setSeverity('');
    setEventType('');
    setUserRole('');
    setStartDate('');
    setEndDate('');
    setOffset(0);
  };

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'high':
        return <AlertTriangle className="h-3 w-3" />;
      case 'medium':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!hasAdminAccess) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Extended Audit Logs
              {isSuperAdmin && (
                <Badge variant="outline" className="gap-1 border-yellow-500/50 text-yellow-600">
                  <Crown className="h-3 w-3" />
                  Full Access
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isSuperAdmin 
                ? 'Full historical access with advanced filters'
                : 'View audit logs from the last 30 days'}
            </CardDescription>
          </div>
          <Button onClick={exportLogs} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Event Type</Label>
            <Input
              className="h-8"
              placeholder="e.g., role_changed"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            />
          </div>
          
          {isSuperAdmin && (
            <div className="space-y-1">
              <Label className="text-xs">User Role</Label>
              <Select value={userRole} onValueChange={setUserRole}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-1">
            <Label className="text-xs">Start Date</Label>
            <Input
              type="date"
              className="h-8"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">End Date</Label>
            <Input
              type="date"
              className="h-8"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <Filter className="h-3 w-3 mr-1" />
            Clear Filters
          </Button>
          <span className="text-xs text-muted-foreground">
            Showing {logs.length} of {totalCount} records
          </span>
        </div>

        {/* Logs Table */}
        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Timestamp</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Severity</TableHead>
                {isSuperAdmin && <TableHead>Role</TableHead>}
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center py-8">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {log.event_type}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {log.action || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityColor(log.severity) as any} className="gap-1 text-xs">
                        {getSeverityIcon(log.severity)}
                        {log.severity}
                      </Badge>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.user_role || 'unknown'}
                        </Badge>
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

        {/* Pagination */}
        {totalCount > limit && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0 || loading}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {Math.floor(offset / limit) + 1} of {Math.ceil(totalCount / limit)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= totalCount || loading}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
