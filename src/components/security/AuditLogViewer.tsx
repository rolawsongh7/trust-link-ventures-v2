import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Download, Filter, Search, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { AuditLogger, AuditSeverity } from '@/lib/auditLogger';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export const AuditLogViewer: React.FC = () => {
  const { user, hasAdminAccess } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | 'all'>('all');
  const [summary, setSummary] = useState<any[]>([]);

  useEffect(() => {
    loadLogs();
    loadSummary();
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summary.slice(0, 3).map((item, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {item.event_type.replace(/_/g, ' ').toUpperCase()}
                  </p>
                  <p className="text-2xl font-bold">{item.count}</p>
                </div>
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Last: {format(new Date(item.last_occurrence), 'MMM d, HH:mm')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

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
