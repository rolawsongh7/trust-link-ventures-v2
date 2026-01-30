import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  RefreshCw, 
  FileText, 
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Database
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRoleAuth } from '@/hooks/useRoleAuth';

export const SystemToolsCard = () => {
  const { hasSuperAdminAccess } = useRoleAuth();
  const { toast } = useToast();
  const [cleaningOrphans, setCleaningOrphans] = useState(false);
  const [clearingSessions, setClearingSessions] = useState(false);
  const [repairingMappings, setRepairingMappings] = useState(false);

  // Defense in depth
  if (!hasSuperAdminAccess) return null;

  const handleCleanOrphanedRecords = async () => {
    setCleaningOrphans(true);
    try {
      // Clean up orphaned customer_users entries
      const { data, error } = await supabase.rpc('repair_customer_user_mappings');
      
      if (error) throw error;

      toast({
        title: "Cleanup Complete",
        description: `Repaired ${data || 0} customer-user mappings.`,
      });

      // Log the action
      await supabase.from('audit_logs').insert({
        event_type: 'system_cleanup',
        action: 'repair_customer_user_mappings',
        severity: 'high',
        event_data: { records_fixed: data },
        ip_address: '0.0.0.0'
      });
    } catch (error: any) {
      console.error('Cleanup failed:', error);
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to clean orphaned records.",
        variant: "destructive",
      });
    } finally {
      setCleaningOrphans(false);
    }
  };

  const handleClearExpiredSessions = async () => {
    setClearingSessions(true);
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_sessions');
      
      if (error) throw error;

      toast({
        title: "Sessions Cleared",
        description: `Cleared ${data || 0} expired sessions.`,
      });

      // Log the action
      await supabase.from('audit_logs').insert({
        event_type: 'system_cleanup',
        action: 'cleanup_expired_sessions',
        severity: 'high',
        event_data: { sessions_cleared: data },
        ip_address: '0.0.0.0'
      });
    } catch (error: any) {
      console.error('Session cleanup failed:', error);
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to clear expired sessions.",
        variant: "destructive",
      });
    } finally {
      setClearingSessions(false);
    }
  };

  const handleCleanupExpiredDevices = async () => {
    setRepairingMappings(true);
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_devices');
      
      if (error) throw error;

      toast({
        title: "Devices Cleaned",
        description: `Removed ${data || 0} expired trusted devices.`,
      });

      // Log the action
      await supabase.from('audit_logs').insert({
        event_type: 'system_cleanup',
        action: 'cleanup_expired_devices',
        severity: 'high',
        event_data: { devices_removed: data },
        ip_address: '0.0.0.0'
      });
    } catch (error: any) {
      console.error('Device cleanup failed:', error);
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to clean expired devices.",
        variant: "destructive",
      });
    } finally {
      setRepairingMappings(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          System Maintenance Tools
        </CardTitle>
        <CardDescription>
          Database cleanup and maintenance operations. Use with caution - all actions are logged.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning Banner */}
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
                System Maintenance Mode
              </h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                These tools perform database operations. Each action is logged with high severity in the audit trail.
              </p>
            </div>
          </div>
        </div>

        {/* Tool Buttons */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Repair Customer Mappings */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">Repair User Mappings</span>
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  Fix orphaned customer-user relationships
                </p>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Repair Customer-User Mappings?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will scan for customers with emails matching auth users and create 
                  missing mappings. This is a safe operation that only adds missing links.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleCleanOrphanedRecords}
                  disabled={cleaningOrphans}
                >
                  {cleaningOrphans ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    'Run Repair'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Clear Expired Sessions */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  <span className="font-medium">Clear Expired Sessions</span>
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  Remove stale session records from database
                </p>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Expired Sessions?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark all expired user sessions as inactive. 
                  This is a routine cleanup operation.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleClearExpiredSessions}
                  disabled={clearingSessions}
                >
                  {clearingSessions ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    'Clear Sessions'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Cleanup Expired Devices */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  <span className="font-medium">Clean Trusted Devices</span>
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  Remove expired trusted device records
                </p>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clean Expired Trusted Devices?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove trusted device entries that have expired. 
                  Users will need to re-verify on affected devices.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleCleanupExpiredDevices}
                  disabled={repairingMappings}
                >
                  {repairingMappings ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Cleaning...
                    </>
                  ) : (
                    'Clean Devices'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};
