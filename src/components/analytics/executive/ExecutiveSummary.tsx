import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, TrendingDown, Info } from 'lucide-react';
import type { Order } from '@/hooks/useOrdersQuery';
import type { Quote } from '@/hooks/useQuotesQuery';
import type { Customer } from '@/hooks/useCustomersQuery';

interface ExecutiveSummaryProps {
  orders: Order[];
  quotes: Quote[];
  customers: Customer[];
}

interface SummaryInsight {
  type: 'warning' | 'opportunity' | 'info';
  message: string;
  metric?: string;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  orders,
  quotes,
  customers
}) => {
  const insights = React.useMemo(() => {
    const summaries: SummaryInsight[] = [];
    
    // Revenue analysis
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    
    // Pending payments analysis
    const pendingPayments = orders.filter(o => o.status === 'pending_payment');
    const pendingTotal = pendingPayments.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const pendingPercentage = totalRevenue > 0 ? (pendingTotal / totalRevenue) * 100 : 0;
    
    if (pendingPercentage > 15) {
      summaries.push({
        type: 'warning',
        message: `${pendingPercentage.toFixed(0)}% of revenue is currently pending payment. Consider following up on overdue invoices.`,
        metric: `GHS ${(pendingTotal / 1000).toFixed(0)}K at risk`
      });
    }

    // Quote conversion analysis
    const recentQuotes = quotes.filter(q => {
      if (!q.created_at) return false;
      const daysSince = (Date.now() - new Date(q.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    });
    const acceptedQuotes = recentQuotes.filter(q => q.status === 'accepted');
    const conversionRate = recentQuotes.length > 0 
      ? (acceptedQuotes.length / recentQuotes.length) * 100 
      : 0;

    if (conversionRate < 30 && recentQuotes.length > 5) {
      summaries.push({
        type: 'warning',
        message: `Quote conversion rate is ${conversionRate.toFixed(0)}% this month. Review pricing or follow-up timing.`,
        metric: `${acceptedQuotes.length}/${recentQuotes.length} converted`
      });
    } else if (conversionRate > 50 && recentQuotes.length > 5) {
      summaries.push({
        type: 'opportunity',
        message: `Strong conversion rate of ${conversionRate.toFixed(0)}%. Consider expanding outreach.`,
        metric: `${acceptedQuotes.length} deals closed`
      });
    }

    // Customer concentration risk
    const customerRevenue: Record<string, number> = {};
    deliveredOrders.forEach(o => {
      if (o.customer_id) {
        customerRevenue[o.customer_id] = (customerRevenue[o.customer_id] || 0) + (o.total_amount || 0);
      }
    });
    
    const sortedCustomers = Object.entries(customerRevenue)
      .sort(([, a], [, b]) => b - a);
    
    if (sortedCustomers.length > 0 && totalRevenue > 0) {
      const topCustomerRevenue = sortedCustomers[0][1];
      const topCustomerPercentage = (topCustomerRevenue / totalRevenue) * 100;
      
      if (topCustomerPercentage > 40) {
        const topCustomer = customers.find(c => c.id === sortedCustomers[0][0]);
        summaries.push({
          type: 'warning',
          message: `${topCustomerPercentage.toFixed(0)}% of revenue comes from ${topCustomer?.company_name || 'one customer'}. Consider diversifying.`,
          metric: 'Concentration risk'
        });
      }
    }

    // Growth opportunity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentRevenue = orders
      .filter(o => o.status === 'delivered' && o.created_at && new Date(o.created_at) > thirtyDaysAgo)
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
    
    const previousRevenue = orders
      .filter(o => o.status === 'delivered' && o.created_at && 
        new Date(o.created_at) > sixtyDaysAgo && new Date(o.created_at) <= thirtyDaysAgo)
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    if (previousRevenue > 0) {
      const growth = ((recentRevenue - previousRevenue) / previousRevenue) * 100;
      if (growth > 20) {
        summaries.push({
          type: 'opportunity',
          message: `Revenue grew ${growth.toFixed(0)}% month-over-month. Maintain momentum with proactive outreach.`,
          metric: `+GHS ${((recentRevenue - previousRevenue) / 1000).toFixed(0)}K`
        });
      } else if (growth < -10) {
        summaries.push({
          type: 'warning',
          message: `Revenue declined ${Math.abs(growth).toFixed(0)}% vs last month. Review customer activity and market conditions.`,
          metric: `-GHS ${(Math.abs(recentRevenue - previousRevenue) / 1000).toFixed(0)}K`
        });
      }
    }

    // Add a general info if no critical insights
    if (summaries.length === 0) {
      summaries.push({
        type: 'info',
        message: 'Operations running normally. No critical issues detected this week.'
      });
    }

    return summaries;
  }, [orders, quotes, customers]);

  const getInsightIcon = (type: SummaryInsight['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'opportunity':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getInsightStyles = (type: SummaryInsight['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800';
      case 'opportunity':
        return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800';
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Weekly Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-3 rounded-lg border ${getInsightStyles(insight.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getInsightIcon(insight.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed">
                  {insight.message}
                </p>
                {insight.metric && (
                  <Badge variant="secondary" className="mt-2 text-xs font-medium">
                    {insight.metric}
                  </Badge>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
};
