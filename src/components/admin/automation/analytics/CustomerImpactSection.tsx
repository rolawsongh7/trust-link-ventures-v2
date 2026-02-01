/**
 * Phase 4.4: Customer Impact Section
 * Metrics and warnings for customer-facing automation
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Mail,
  Clock,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Users,
} from 'lucide-react';
import { useCustomerImpact } from '@/hooks/useAutomationAnalytics';
import { cn } from '@/lib/utils';

export const CustomerImpactSection: React.FC = () => {
  const { data, isLoading, error } = useCustomerImpact(7);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-8 rounded-lg mb-2" />
                <Skeleton className="h-6 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6 text-center text-destructive flex items-center justify-center gap-2">
          <XCircle className="h-5 w-5" />
          Failed to load customer impact metrics
        </CardContent>
      </Card>
    );
  }

  const hasWarnings = data.warningsCount > 0;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold">{data.notificationsSent7d}</p>
              <p className="text-xs text-muted-foreground">Sent (7d)</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold">{data.notificationsSent30d}</p>
              <p className="text-xs text-muted-foreground">Sent (30d)</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  data.throttledRate > 30 ? "bg-yellow-500/10" : "bg-green-500/10"
                )}>
                  <Clock className={cn(
                    "h-4 w-4",
                    data.throttledRate > 30 ? "text-yellow-600" : "text-green-600"
                  )} />
                </div>
              </div>
              <p className="text-2xl font-bold">{data.throttledRate}%</p>
              <p className="text-xs text-muted-foreground">Throttled</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  data.failedCount > 0 ? "bg-red-500/10" : "bg-green-500/10"
                )}>
                  {data.failedCount > 0 ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </div>
              <p className="text-2xl font-bold">{data.failedCount}</p>
              <p className="text-xs text-muted-foreground">Failed (30d)</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-700 dark:text-yellow-400">
              {data.warningsCount} Warning{data.warningsCount > 1 ? 's' : ''} Detected
            </AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1">
                {data.warnings.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-yellow-600">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Customer Communication Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total notifications sent (7d)</span>
              <Badge variant="secondary">{data.notificationsSent7d}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Duplicate prevention rate</span>
              <Badge variant={data.throttledRate > 0 ? "default" : "secondary"}>
                {data.throttledRate}% throttled
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Delivery success rate</span>
              <Badge variant={data.failedCount === 0 ? "default" : "destructive"}>
                {data.notificationsSent30d > 0 
                  ? Math.round(((data.notificationsSent30d - data.failedCount) / data.notificationsSent30d) * 100)
                  : 100}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
