/**
 * Phase 4.1: Automation Control Center
 * Main admin page for automation management
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  FileText, 
  Settings2,
  AlertTriangle
} from 'lucide-react';
import { AutomationStatusCard } from '@/components/automation/AutomationStatusCard';
import { AutomationRulesList } from '@/components/automation/AutomationRulesList';
import { AutomationExecutionLog } from '@/components/automation/AutomationExecutionLog';
import { AutomationKillSwitch } from '@/components/automation/AutomationKillSwitch';
import { useIsAutomationEnabled } from '@/hooks/useAutomation';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { Navigate } from 'react-router-dom';

const AutomationControl: React.FC = () => {
  const { hasAdminAccess, hasSuperAdminAccess, loading } = useRoleAuth();
  const { data: isEnabled } = useIsAutomationEnabled();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!hasAdminAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Automation Control Center
              {isEnabled && (
                <Badge className="bg-yellow-500 hover:bg-yellow-600">
                  Active
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              Manage automation rules and monitor execution
            </p>
          </div>
        </div>
      </motion.div>

      {/* Phase 4.1 Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30"
      >
        <AlertTriangle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-600 dark:text-blue-400">
            Phase 4.1: Infrastructure Only
          </p>
          <p className="text-muted-foreground">
            This phase provides automation infrastructure. Rule creation and editing will be available in Phase 4.2.
            All automation is disabled by default and requires super admin to enable.
          </p>
        </div>
      </motion.div>

      {/* Status Card */}
      <AutomationStatusCard />

      {/* Tabbed Content */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="executions" className="gap-2">
            <FileText className="h-4 w-4" />
            Execution Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AutomationRulesList />
          </motion.div>
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AutomationExecutionLog />
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Kill Switch (Super Admin Only) */}
      {hasSuperAdminAccess && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AutomationKillSwitch />
        </motion.div>
      )}
    </div>
  );
};

export default AutomationControl;
