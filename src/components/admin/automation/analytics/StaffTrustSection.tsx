/**
 * Phase 4.4: Staff Trust Section
 * Feedback summary and recent feedback list
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { useStaffTrust } from '@/hooks/useAutomationAnalytics';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export const StaffTrustSection: React.FC = () => {
  const { data, isLoading, error } = useStaffTrust(30);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6 text-center text-destructive flex items-center justify-center gap-2">
          <XCircle className="h-5 w-5" />
          Failed to load staff trust metrics
        </CardContent>
      </Card>
    );
  }

  const total = data.totalFeedback;
  const helpfulPercent = total > 0 ? Math.round((data.helpfulCount / total) * 100) : 0;
  const neutralPercent = total > 0 ? Math.round((data.neutralCount / total) * 100) : 0;
  const harmfulPercent = total > 0 ? Math.round((data.harmfulCount / total) * 100) : 0;

  const getFeedbackIcon = (type: string) => {
    switch (type) {
      case 'helpful':
        return <ThumbsUp className="h-4 w-4 text-green-600" />;
      case 'harmful':
        return <ThumbsDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getFeedbackBadge = (type: string) => {
    switch (type) {
      case 'helpful':
        return <Badge className="bg-green-500/10 text-green-600">Helpful</Badge>;
      case 'harmful':
        return <Badge className="bg-red-500/10 text-red-600">Harmful</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600">Neutral</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <ThumbsUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.helpfulCount}</p>
                  <p className="text-xs text-muted-foreground">Helpful ({helpfulPercent}%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Minus className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.neutralCount}</p>
                  <p className="text-xs text-muted-foreground">Neutral ({neutralPercent}%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <ThumbsDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.harmfulCount}</p>
                  <p className="text-xs text-muted-foreground">Harmful ({harmfulPercent}%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Feedback Distribution Bar */}
      {total > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Feedback Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Helpful</span>
                  <span className="font-medium">{helpfulPercent}%</span>
                </div>
                <Progress value={helpfulPercent} className="h-2 [&>div]:bg-green-500" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Neutral</span>
                  <span className="font-medium">{neutralPercent}%</span>
                </div>
                <Progress value={neutralPercent} className="h-2 [&>div]:bg-yellow-500" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Harmful</span>
                  <span className="font-medium">{harmfulPercent}%</span>
                </div>
                <Progress value={harmfulPercent} className="h-2 [&>div]:bg-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Feedback List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Recent Feedback (30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentFeedback.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No feedback submitted yet</p>
              <p className="text-sm">Staff can submit feedback from the execution log</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentFeedback.map((feedback) => (
                <motion.div
                  key={feedback.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="mt-0.5">
                    {getFeedbackIcon(feedback.feedbackType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getFeedbackBadge(feedback.feedbackType)}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {feedback.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {feedback.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Execution: {feedback.executionId.slice(0, 8)}...
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
