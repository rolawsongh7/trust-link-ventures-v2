/**
 * Phase 4.4: Rule Detail Drawer
 * Detailed view for a single automation rule
 */

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Mail,
  Clock,
  RefreshCw,
  Power,
} from 'lucide-react';
import { useRuleDetails, useReenableRule } from '@/hooks/useAutomationAnalytics';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { formatTriggerEvent } from '@/utils/automationHelpers';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RuleDetailDrawerProps {
  ruleId: string | null;
  onClose: () => void;
}

export const RuleDetailDrawer: React.FC<RuleDetailDrawerProps> = ({
  ruleId,
  onClose,
}) => {
  const { hasSuperAdminAccess } = useRoleAuth();
  const { data, isLoading, error, refetch } = useRuleDetails(ruleId, 30);
  const reenableMutation = useReenableRule();

  const handleReenable = async () => {
    if (!ruleId) return;
    await reenableMutation.mutateAsync(ruleId);
    refetch();
  };

  const chartData = data?.dailyTrend.map((d) => ({
    date: format(new Date(d.date), 'MMM d'),
    Success: d.successes,
    Failure: d.failures,
    Skipped: d.skipped,
  })) || [];

  return (
    <Sheet open={!!ruleId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {data?.rule.ruleName || 'Rule Details'}
            {data?.rule.isCustomerFacing && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                <Users className="h-3 w-3 mr-1" />
                Customer
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {data ? formatTriggerEvent(data.rule.triggerEvent) : 'Loading...'}
          </SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-lg bg-destructive/10 text-destructive text-center">
            Failed to load rule details
          </div>
        )}

        {data && (
          <div className="space-y-6 mt-6">
            {/* Status Banner */}
            {data.rule.autoDisabled && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Auto-Disabled</span>
                </div>
                {hasSuperAdminAccess && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReenable}
                    disabled={reenableMutation.isPending}
                  >
                    <Power className="h-4 w-4 mr-1" />
                    Re-enable
                  </Button>
                )}
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">Executions (30d)</span>
                  </div>
                  <p className="text-2xl font-bold">{data.rule.executions.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Avg {data.rule.avgPerDay}/day
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Last Run</span>
                  </div>
                  <p className="text-lg font-medium">
                    {data.rule.lastRun
                      ? formatDistanceToNow(new Date(data.rule.lastRun), { addSuffix: true })
                      : 'Never'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Success/Failure Rates */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Success Rate
                    </span>
                    <span className="font-medium">{data.rule.successRate}%</span>
                  </div>
                  <Progress 
                    value={data.rule.successRate} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Failure Rate
                    </span>
                    <span className="font-medium">{data.rule.failureRate}%</span>
                  </div>
                  <Progress 
                    value={data.rule.failureRate} 
                    className="h-2 [&>div]:bg-red-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Trend Chart */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Daily Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          width={30}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="Success" 
                          stroke="hsl(142, 76%, 36%)"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="Failure" 
                          stroke="hsl(0, 84%, 60%)"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="Skipped" 
                          stroke="hsl(48, 96%, 53%)"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Impact Metrics (for customer-facing) */}
            {data.rule.isCustomerFacing && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Customer Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {data.impactMetrics.customerNotificationsSent}
                      </p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">
                        {data.impactMetrics.customerNotificationsThrottled}
                      </p>
                      <p className="text-xs text-muted-foreground">Throttled</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-muted-foreground">
                        {data.impactMetrics.entitiesAffected}
                      </p>
                      <p className="text-xs text-muted-foreground">Entities</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skip Reasons */}
            {data.skipReasons.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Skip Reasons</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.skipReasons.slice(0, 5).map((reason, i) => (
                      <div 
                        key={i}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-muted-foreground truncate max-w-[200px]">
                          {reason.reason}
                        </span>
                        <Badge variant="secondary">{reason.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
