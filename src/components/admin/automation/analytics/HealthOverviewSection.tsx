/**
 * Phase 4.4: Health Overview Section
 * KPI cards showing automation health status
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Zap, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useHealthOverview, type HealthStatus } from '@/hooks/useAutomationAnalytics';
import { cn } from '@/lib/utils';

const healthColors: Record<HealthStatus, { bg: string; text: string; border: string }> = {
  healthy: {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/30',
  },
  warning: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-500/30',
  },
  critical: {
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/30',
  },
};

const healthLabels: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  warning: 'Needs Attention',
  critical: 'Critical',
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  delay?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  trend,
  variant = 'default',
  delay = 0,
}) => {
  const variantStyles = {
    default: 'bg-primary/5',
    success: 'bg-green-500/10',
    warning: 'bg-yellow-500/10',
    error: 'bg-red-500/10',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className={cn('p-2 rounded-lg', variantStyles[variant])}>
              {icon}
            </div>
            {trend !== undefined && trend !== 0 && (
              <Badge 
                variant={trend >= 0 ? 'default' : 'secondary'} 
                className="flex items-center gap-1"
              >
                {trend >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend > 0 ? '+' : ''}{trend}%
              </Badge>
            )}
          </div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </CardContent>
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full" />
      </Card>
    </motion.div>
  );
};

export const HealthOverviewSection: React.FC = () => {
  const { data, isLoading, error } = useHealthOverview(7);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-8 w-8 rounded-lg mb-2" />
              <Skeleton className="h-6 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-4 flex items-center gap-2 text-destructive">
          <XCircle className="h-5 w-5" />
          <span>Failed to load health metrics</span>
        </CardContent>
      </Card>
    );
  }

  const colors = healthColors[data.healthStatus];

  return (
    <div className="space-y-4">
      {/* Health Status Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border',
          colors.bg,
          colors.border
        )}
      >
        {data.healthStatus === 'healthy' && <CheckCircle className={cn('h-5 w-5', colors.text)} />}
        {data.healthStatus === 'warning' && <AlertTriangle className={cn('h-5 w-5', colors.text)} />}
        {data.healthStatus === 'critical' && <XCircle className={cn('h-5 w-5', colors.text)} />}
        <div>
          <span className={cn('font-medium', colors.text)}>
            System Status: {healthLabels[data.healthStatus]}
          </span>
          <span className="text-sm text-muted-foreground ml-2">
            Last 7 days
          </span>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard
          icon={<Activity className="h-5 w-5" />}
          label="Total Executions"
          value={data.totalExecutions.toLocaleString()}
          trend={data.trend.executions > 0 ? Math.round((data.trend.executions / Math.max(data.totalExecutions - data.trend.executions, 1)) * 100) : undefined}
          delay={0}
        />
        <MetricCard
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          label="Success Rate"
          value={`${data.successRate}%`}
          trend={data.trend.successRateDelta}
          variant={data.successRate >= 95 ? 'success' : data.successRate >= 80 ? 'warning' : 'error'}
          delay={0.05}
        />
        <MetricCard
          icon={<XCircle className="h-5 w-5 text-red-600" />}
          label="Failure Rate"
          value={`${data.failureRate}%`}
          variant={data.failureRate <= 5 ? 'success' : data.failureRate <= 20 ? 'warning' : 'error'}
          delay={0.1}
        />
        <MetricCard
          icon={<Zap className="h-5 w-5 text-primary" />}
          label="Active Rules"
          value={data.activeRulesCount}
          delay={0.15}
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5 text-yellow-600" />}
          label="Auto-Disabled"
          value={data.autoDisabledCount}
          variant={data.autoDisabledCount === 0 ? 'success' : data.autoDisabledCount < 3 ? 'warning' : 'error'}
          delay={0.2}
        />
      </div>
    </div>
  );
};
