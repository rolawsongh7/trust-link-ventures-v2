import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Crown, 
  Shield, 
  Users, 
  Wrench, 
  Download, 
  RefreshCw, 
  AlertTriangle,
  Lock,
  FileText,
  Activity,
  Search
} from 'lucide-react';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { RoleManagementCard } from './RoleManagementCard';
import { SystemToolsCard } from './SystemToolsCard';
import { MaintenanceModeCard } from './MaintenanceModeCard';
import { OrphanedDataCard } from './OrphanedDataCard';
import { BulkPdfRegenerationCard } from './BulkPdfRegenerationCard';
import { ExtendedAuditLogCard } from './ExtendedAuditLogCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export const SuperAdminTab = () => {
  const { hasSuperAdminAccess, loading } = useRoleAuth();
  const { toast } = useToast();
  const [exportingLogs, setExportingLogs] = useState(false);

  // Defense in depth: Return null if not super admin
  if (!hasSuperAdminAccess) return null;

  const handleExportFullAuditLogs = async () => {
    setExportingLogs(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000);

      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `full-audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Exported ${data?.length || 0} audit log entries.`,
      });
    } catch (error: any) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export audit logs.",
        variant: "destructive",
      });
    } finally {
      setExportingLogs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Super Admin Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-orange-500/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Crown className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Super Admin Controls
                  <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400">
                    Elevated Access
                  </Badge>
                </CardTitle>
                <CardDescription>
                  System-level tools and controls. All actions are logged with high severity.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Server-Side Enforced
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                Audit Trail Enabled
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                High-Risk Operations
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabbed Interface for Super Admin Features */}
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system" className="gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Data Health</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Audit</span>
          </TabsTrigger>
        </TabsList>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MaintenanceModeCard />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <SystemToolsCard />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <BulkPdfRegenerationCard />
          </motion.div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RoleManagementCard />
          </motion.div>
        </TabsContent>

        {/* Data Health Tab */}
        <TabsContent value="data" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <OrphanedDataCard />
          </motion.div>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ExtendedAuditLogCard />
          </motion.div>
          
          {/* Full Audit Export */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Full Audit Log Export
                </CardTitle>
                <CardDescription>
                  Export complete audit history (up to 10,000 entries). Regular admins can only access recent logs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleExportFullAuditLogs}
                  disabled={exportingLogs}
                  variant="outline"
                >
                  {exportingLogs ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export Full Audit History
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
