/**
 * Phase 4.1: Automation Execution Log
 * Displays execution history with filtering
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  RefreshCw, 
  FileText,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import { useAutomationExecutions, useAutomationRules } from '@/hooks/useAutomation';
import { 
  formatTriggerEvent, 
  formatDuration,
  getExecutionStatusColor,
  getExecutionStatusIcon,
  type AutomationExecution,
  type ExecutionStatus
} from '@/utils/automationHelpers';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExecutionRowProps {
  execution: AutomationExecution;
  ruleName?: string;
}

const ExecutionRow: React.FC<ExecutionRowProps> = ({ execution, ruleName }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const StatusIcon = getExecutionStatusIcon(execution.status);
  const statusColor = getExecutionStatusColor(execution.status);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-1.5 rounded ${statusColor}`}>
            <StatusIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{ruleName || 'Unknown Rule'}</span>
              <Badge variant="outline" className="text-xs">
                {formatTriggerEvent(execution.trigger_event)}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{format(new Date(execution.executed_at), 'MMM d, h:mm:ss a')}</span>
              {execution.duration_ms && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(execution.duration_ms)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColor}>
            {execution.status}
          </Badge>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t"
          >
            <div className="p-3 bg-muted/30 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Entity ID:</span>
                  <span className="ml-2 font-mono text-xs">{execution.entity_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Entity Type:</span>
                  <span className="ml-2">{execution.entity_type}</span>
                </div>
              </div>

              {execution.error_message && (
                <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-600 dark:text-red-400">
                  <span className="font-medium">Error: </span>
                  {execution.error_message}
                </div>
              )}

              {execution.result && Object.keys(execution.result).length > 0 && (
                <div>
                  <span className="text-muted-foreground">Result:</span>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(execution.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface AutomationExecutionLogProps {
  ruleId?: string;
  limit?: number;
}

export const AutomationExecutionLog: React.FC<AutomationExecutionLogProps> = ({ 
  ruleId,
  limit = 50 
}) => {
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | 'all'>('all');
  
  const { data: executions, isLoading, refetch } = useAutomationExecutions({
    ruleId,
    limit,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  
  const { data: rules } = useAutomationRules();

  // Create a map of rule IDs to names
  const ruleNameMap = React.useMemo(() => {
    if (!rules) return new Map<string, string>();
    return new Map(rules.map(r => [r.id, r.name]));
  }, [rules]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Execution Log</CardTitle>
              <CardDescription>
                {executions?.length || 0} executions recorded
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ExecutionStatus | 'all')}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!executions || executions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No executions recorded</p>
            <p className="text-sm">Executions will appear here when rules are triggered</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {executions.map((execution, index) => (
                <motion.div
                  key={execution.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <ExecutionRow
                    execution={execution}
                    ruleName={ruleNameMap.get(execution.rule_id)}
                  />
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
