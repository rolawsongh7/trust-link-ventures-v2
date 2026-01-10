import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Mail, Clock, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommunicationThread {
  id: string;
  subject: string;
  messageCount: number;
  hasUnread: boolean;
  latestMessage: {
    communication_date: string;
    communication_type: string;
  };
  messages: Array<{
    communication_date: string;
    direction: string;
  }>;
}

interface CommunicationsKPISummaryProps {
  threads: CommunicationThread[];
  communications: Array<{
    communication_date: string;
    communication_type: string;
    direction: string;
  }>;
}

export const CommunicationsKPISummary: React.FC<CommunicationsKPISummaryProps> = ({ 
  threads,
  communications 
}) => {
  // Calculate KPIs
  const totalThreads = threads.length;
  const unreadThreads = threads.filter(t => t.hasUnread).length;
  
  // This week's activity
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeekCount = communications.filter(c => 
    new Date(c.communication_date) >= weekAgo
  ).length;
  
  // Response rate (outbound / total)
  const outboundCount = communications.filter(c => c.direction === 'outbound').length;
  const responseRate = communications.length > 0 
    ? Math.round((outboundCount / communications.length) * 100)
    : 0;

  // Contact forms (assuming subject contains "Contact Form:")
  const contactForms = threads.filter(t => 
    t.subject?.includes('Contact Form:')
  ).length;

  const kpis = [
    {
      label: 'Total Threads',
      value: totalThreads.toString(),
      icon: MessageSquare,
      gradient: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/15 text-primary',
      trend: null,
    },
    {
      label: 'Unread',
      value: unreadThreads.toString(),
      icon: Mail,
      gradient: 'from-destructive/20 to-destructive/5',
      iconBg: 'bg-destructive/15 text-destructive',
      trend: unreadThreads > 0 ? 'Needs attention' : 'All caught up',
      trendPositive: unreadThreads === 0,
    },
    {
      label: 'This Week',
      value: thisWeekCount.toString(),
      icon: TrendingUp,
      gradient: 'from-emerald-500/20 to-emerald-500/5',
      iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      trend: 'messages',
    },
    {
      label: 'Response Rate',
      value: `${responseRate}%`,
      icon: Clock,
      gradient: 'from-amber-500/20 to-amber-500/5',
      iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      trend: responseRate >= 50 ? 'Good' : 'Improve',
      trendPositive: responseRate >= 50,
    },
    {
      label: 'Contact Forms',
      value: contactForms.toString(),
      icon: Users,
      gradient: 'from-violet-500/20 to-violet-500/5',
      iconBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
      trend: 'submissions',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpis.map((kpi, index) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
          className={cn(
            "relative overflow-hidden rounded-xl border bg-gradient-to-br p-4",
            kpi.gradient,
            "border-border/50 dark:border-border/30"
          )}
        >
          {/* Background decoration */}
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-background/50 to-transparent blur-2xl" />
          
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className={cn(
                "rounded-lg p-2.5 shadow-sm",
                kpi.iconBg
              )}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {kpi.value}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                {kpi.label}
              </p>
              {kpi.trend && (
                <p className={cn(
                  "text-xs font-medium",
                  kpi.trendPositive === true && "text-emerald-600 dark:text-emerald-400",
                  kpi.trendPositive === false && "text-amber-600 dark:text-amber-400",
                  kpi.trendPositive === undefined && "text-muted-foreground"
                )}>
                  {kpi.trend}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
