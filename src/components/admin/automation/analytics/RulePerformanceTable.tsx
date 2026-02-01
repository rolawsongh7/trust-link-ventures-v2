/**
 * Phase 4.4: Rule Performance Table
 * Sortable table showing performance metrics for all rules
 */

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Users,
  Eye,
} from 'lucide-react';
import { useRulePerformance, type RulePerformance, type RuleFilter } from '@/hooks/useAutomationAnalytics';
import { formatTriggerEvent } from '@/utils/automationHelpers';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface RulePerformanceTableProps {
  onSelectRule: (ruleId: string) => void;
}

type SortField = 'name' | 'executions' | 'successRate' | 'failureRate' | 'lastRun';
type SortDirection = 'asc' | 'desc';

export const RulePerformanceTable: React.FC<RulePerformanceTableProps> = ({
  onSelectRule,
}) => {
  const [filter, setFilter] = useState<RuleFilter>('all');
  const [sortField, setSortField] = useState<SortField>('executions');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data, isLoading, error } = useRulePerformance(30, filter);

  const sortedData = useMemo(() => {
    if (!data) return [];

    return [...data].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.ruleName.localeCompare(b.ruleName);
          break;
        case 'executions':
          comparison = a.executions - b.executions;
          break;
        case 'successRate':
          comparison = a.successRate - b.successRate;
          break;
        case 'failureRate':
          comparison = a.failureRate - b.failureRate;
          break;
        case 'lastRun':
          const aTime = a.lastRun ? new Date(a.lastRun).getTime() : 0;
          const bTime = b.lastRun ? new Date(b.lastRun).getTime() : 0;
          comparison = aTime - bTime;
          break;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortableHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({
    field,
    children,
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 font-medium"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field ? (
        sortDirection === 'desc' ? (
          <ArrowDown className="ml-1 h-4 w-4" />
        ) : (
          <ArrowUp className="ml-1 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
      )}
    </Button>
  );

  const getStatusBadge = (rule: RulePerformance) => {
    if (rule.autoDisabled) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Auto-Disabled
        </Badge>
      );
    }
    if (rule.enabled) {
      return <Badge variant="default" className="text-xs">Active</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Disabled</Badge>;
  };

  const getRateBadge = (rate: number, isSuccess: boolean) => {
    if (isSuccess) {
      if (rate >= 95) return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">{rate}%</Badge>;
      if (rate >= 80) return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">{rate}%</Badge>;
      return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400">{rate}%</Badge>;
    } else {
      if (rate <= 5) return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">{rate}%</Badge>;
      if (rate <= 20) return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">{rate}%</Badge>;
      return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400">{rate}%</Badge>;
    }
  };

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6 text-center text-destructive">
          Failed to load rule performance data
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-medium">Rule Performance (30 days)</CardTitle>
        <Select value={filter} onValueChange={(v) => setFilter(v as RuleFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rules</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
            <SelectItem value="auto-disabled">Auto-Disabled</SelectItem>
            <SelectItem value="customer-facing">Customer-Facing</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  <SortableHeader field="name">Rule Name</SortableHeader>
                </TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="executions">Executions</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="successRate">Success</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="failureRate">Failure</SortableHeader>
                </TableHead>
                <TableHead className="text-right">Avg/Day</TableHead>
                <TableHead>
                  <SortableHeader field="lastRun">Last Run</SortableHeader>
                </TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No rules found matching the filter
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((rule) => (
                  <TableRow
                    key={rule.ruleId}
                    className={cn(
                      'cursor-pointer hover:bg-muted/50',
                      rule.isCustomerFacing && 'border-l-4 border-l-blue-500'
                    )}
                    onClick={() => onSelectRule(rule.ruleId)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {rule.ruleName}
                        {rule.isCustomerFacing && (
                          <Users className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatTriggerEvent(rule.triggerEvent)}
                    </TableCell>
                    <TableCell>{getStatusBadge(rule)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {rule.executions.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {rule.executions > 0 ? getRateBadge(rule.successRate, true) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {rule.executions > 0 ? getRateBadge(rule.failureRate, false) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {rule.avgPerDay}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rule.lastRun
                        ? formatDistanceToNow(new Date(rule.lastRun), { addSuffix: true })
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRule(rule.ruleId);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
