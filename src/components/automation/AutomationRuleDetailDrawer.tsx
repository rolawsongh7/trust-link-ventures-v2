/**
 * Phase 4.2: Automation Rule Detail Drawer
 * Shows full rule configuration with conditions, actions, and recent executions
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Zap,
  Clock,
  Bell,
  FileText,
  CheckCircle2,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { useAutomationRule, useAutomationExecutions, useAutomationMutations } from '@/hooks/useAutomation';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import {
  formatTriggerEvent,
  formatEntityType,
  formatConditions,
  formatActions,
  formatDuration,
  isSLARelatedTrigger,
  getSLAHighlightColor,
  getExecutionStatusColor,
  getExecutionStatusIcon,
  getActionTypeIcon,
} from '@/utils/automationHelpers';
import { format } from 'date-fns';

interface AutomationRuleDetailDrawerProps {
  ruleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AutomationRuleDetailDrawer: React.FC<AutomationRuleDetailDrawerProps> = ({
  ruleId,
  open,
  onOpenChange,
}) => {
  const { data: rule, isLoading: ruleLoading } = useAutomationRule(ruleId);
  const { data: executions, isLoading: executionsLoading } = useAutomationExecutions({
    ruleId: ruleId || undefined,
    limit: 10,
  });
  const { toggleRule, isToggling } = useAutomationMutations();
  const { hasSuperAdminAccess } = useRoleAuth();

  const isSLARule = rule ? isSLARelatedTrigger(rule.trigger_event) : false;
  const slaColors = rule ? getSLAHighlightColor(rule.trigger_event) : null;

  const handleToggle = (enabled: boolean) => {
    if (rule) {
      toggleRule({ ruleId: rule.id, enabled });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Rule Details
          </SheetTitle>
          <SheetDescription>
            View automation rule configuration
          </SheetDescription>
        </SheetHeader>

        {ruleLoading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : rule ? (
          <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
            <div className="space-y-6">
              {/* Rule Header */}
              <div className={`p-4 rounded-lg border ${slaColors?.border || ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${slaColors?.badge || 'bg-primary/10'}`}>
                    <Zap className={`h-5 w-5 ${isSLARule ? '' : 'text-primary'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{rule.name}</h3>
                    {rule.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {rule.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Trigger Section */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Trigger
                </h4>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatTriggerEvent(rule.trigger_event)}</span>
                  <span className="text-muted-foreground">on</span>
                  <Badge variant="outline">{formatEntityType(rule.entity_type)}</Badge>
                </div>
              </div>

              {/* Conditions Section */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Conditions
                </h4>
                <ul className="space-y-2">
                  {formatConditions(rule.conditions).map((condition, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-2 text-sm p-2 bg-muted/30 rounded"
                    >
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{condition}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Actions Section */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Actions
                </h4>
                <ul className="space-y-2">
                  {formatActions(rule.actions).map((action, idx) => {
                    const actionType = rule.actions[idx]?.type;
                    const ActionIcon = actionType ? getActionTypeIcon(actionType) : Bell;
                    
                    return (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-start gap-2 text-sm p-2 bg-muted/30 rounded"
                      >
                        <ActionIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{action}</span>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>

              {/* Safety Notice */}
              {isSLARule && (
                <div className="flex items-start gap-2 p-3 bg-accent/50 border border-border rounded-lg">
                  <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    No order data is modified by this rule. Actions are notification and logging only.
                  </p>
                </div>
              )}

              <Separator />

              {/* Status Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status</span>
                  {hasSuperAdminAccess && !rule.auto_disabled_at ? (
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={handleToggle}
                      disabled={isToggling}
                    />
                  ) : (
                    <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                      {rule.auto_disabled_at ? 'Auto-Disabled' : rule.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Failure Count</span>
                  <span className={rule.failure_count > 0 ? 'text-destructive font-medium' : ''}>
                    {rule.failure_count}
                  </span>
                </div>

                {rule.auto_disabled_at && (
                  <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-destructive">
                        Auto-disabled due to failures
                      </p>
                      <p className="text-muted-foreground">
                        Reset the failure count to re-enable
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Priority</span>
                  <span>{rule.priority}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(new Date(rule.created_at), 'MMM d, yyyy')}</span>
                </div>
              </div>

              <Separator />

              {/* Recent Executions */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                  Recent Executions
                </h4>
                
                {executionsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : executions && executions.length > 0 ? (
                  <div className="space-y-2">
                    {executions.map((exec, idx) => {
                      const StatusIcon = getExecutionStatusIcon(exec.status);
                      const statusColor = getExecutionStatusColor(exec.status);
                      
                      return (
                        <motion.div
                          key={exec.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm"
                        >
                          <div className={`p-1 rounded ${statusColor}`}>
                            <StatusIcon className="h-3 w-3" />
                          </div>
                          <span className="flex-1 truncate">
                            {format(new Date(exec.executed_at), 'MMM d, h:mm a')}
                          </span>
                          {exec.duration_ms && (
                            <span className="text-muted-foreground text-xs">
                              {formatDuration(exec.duration_ms)}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {exec.status}
                          </Badge>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No executions recorded</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p>Rule not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
