/**
 * Phase 4.1: Automation Status Card
 * Displays global automation status with toggle control
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Zap, 
  ZapOff, 
  AlertTriangle, 
  Clock, 
  Shield,
  Settings
} from 'lucide-react';
import { useAutomationSettings, useIsAutomationEnabled, useAutomationMutations } from '@/hooks/useAutomation';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export const AutomationStatusCard: React.FC = () => {
  const { data: settings, isLoading: settingsLoading } = useAutomationSettings();
  const { data: isEnabled, isLoading: enabledLoading } = useIsAutomationEnabled();
  const { toggleGlobal, isToggling } = useAutomationMutations();
  const { hasSuperAdminAccess } = useRoleAuth();

  const isLoading = settingsLoading || enabledLoading;

  const handleToggle = (checked: boolean) => {
    toggleGlobal({ 
      enabled: checked, 
      reason: checked ? 'Enabled via admin panel' : 'Disabled via admin panel' 
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={isEnabled ? 'border-yellow-500/50' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isEnabled ? 'bg-yellow-500/10' : 'bg-muted'}`}>
                {isEnabled ? (
                  <Zap className="h-6 w-6 text-yellow-500" />
                ) : (
                  <ZapOff className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Automation Engine
                  <Badge 
                    variant={isEnabled ? 'default' : 'secondary'}
                    className={isEnabled ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                  >
                    {isEnabled ? 'Active' : 'Inactive'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {isEnabled 
                    ? 'Rules are executing on their trigger events'
                    : 'All automation is currently disabled'}
                </CardDescription>
              </div>
            </div>

            {hasSuperAdminAccess && (
              <Switch
                checked={isEnabled ?? false}
                onCheckedChange={handleToggle}
                disabled={isToggling}
                className="data-[state=checked]:bg-yellow-500"
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning Banner when Enabled */}
          {isEnabled && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-600 dark:text-yellow-400">
                  Automation is Active
                </p>
                <p className="text-muted-foreground">
                  Enabled rules will execute automatically. Monitor the execution log for activity.
                </p>
              </div>
            </div>
          )}

          {/* Settings Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Rate Limit:</span>
              <span className="font-medium">{settings?.max_executions_per_minute}/min</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Auto-disable:</span>
              <span className="font-medium">
                {settings?.auto_disable_threshold} failures in {settings?.auto_disable_window_minutes}min
              </span>
            </div>
          </div>

          {/* Last Updated */}
          {settings?.updated_at && (
            <div className="text-xs text-muted-foreground">
              Last updated: {format(new Date(settings.updated_at), 'MMM d, yyyy h:mm a')}
            </div>
          )}

          {/* Link to Full Page */}
          <div className="pt-2 border-t">
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link to="/admin/automation" className="gap-2">
                <Settings className="h-4 w-4" />
                Open Automation Control Center
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
