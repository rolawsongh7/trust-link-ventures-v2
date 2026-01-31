/**
 * Phase 4.1: Automation Rules List
 * Displays all automation rules with status and controls
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  RefreshCw, 
  Zap,
  Info,
  RotateCcw
} from 'lucide-react';
import { useAutomationRules, useAutomationMutations } from '@/hooks/useAutomation';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { 
  formatTriggerEvent, 
  formatEntityType, 
  getRuleStatusInfo,
  type AutomationRule 
} from '@/utils/automationHelpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface RuleRowProps {
  rule: AutomationRule;
  canManage: boolean;
  onToggle: (ruleId: string, enabled: boolean) => void;
  onResetFailures: (ruleId: string) => void;
  isToggling: boolean;
  isResetting: boolean;
}

const RuleRow: React.FC<RuleRowProps> = ({ 
  rule, 
  canManage, 
  onToggle, 
  onResetFailures,
  isToggling,
  isResetting 
}) => {
  const statusInfo = getRuleStatusInfo(rule);
  const isAutoDisabled = !!rule.auto_disabled_at;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Status Indicator */}
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
          isAutoDisabled 
            ? 'bg-orange-500' 
            : rule.enabled 
              ? 'bg-green-500' 
              : 'bg-muted-foreground'
        }`} />

        {/* Rule Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{rule.name}</h4>
            <Badge variant="outline" className="text-xs">
              {formatEntityType(rule.entity_type)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            Trigger: {formatTriggerEvent(rule.trigger_event)}
          </p>
        </div>

        {/* Status Badge */}
        <Badge className={`${statusInfo.color} flex-shrink-0`}>
          {statusInfo.label}
        </Badge>

        {/* Failure Count */}
        {rule.failure_count > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-orange-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">{rule.failure_count}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {rule.failure_count} failures recorded
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Reset Failures Button (if auto-disabled) */}
        {isAutoDisabled && canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResetFailures(rule.id)}
            disabled={isResetting}
            className="gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        )}

        {/* Toggle Switch */}
        {canManage && !isAutoDisabled && (
          <Switch
            checked={rule.enabled}
            onCheckedChange={(checked) => onToggle(rule.id, checked)}
            disabled={isToggling}
          />
        )}

        {/* Info for non-super-admins */}
        {!canManage && (
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              Super admin access required to modify rules
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </motion.div>
  );
};

export const AutomationRulesList: React.FC = () => {
  const { data: rules, isLoading, refetch } = useAutomationRules();
  const { toggleRule, resetFailureCount, isToggling, isResetting } = useAutomationMutations();
  const { hasSuperAdminAccess } = useRoleAuth();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const handleToggle = (ruleId: string, enabled: boolean) => {
    toggleRule({ ruleId, enabled });
  };

  const handleResetFailures = (ruleId: string) => {
    resetFailureCount(ruleId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Automation Rules</CardTitle>
              <CardDescription>
                {rules?.length || 0} rules configured
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!rules || rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No automation rules configured</p>
            <p className="text-sm">Rules can be added in Phase 4.2</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <RuleRow
                  rule={rule}
                  canManage={hasSuperAdminAccess}
                  onToggle={handleToggle}
                  onResetFailures={handleResetFailures}
                  isToggling={isToggling}
                  isResetting={isResetting}
                />
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
