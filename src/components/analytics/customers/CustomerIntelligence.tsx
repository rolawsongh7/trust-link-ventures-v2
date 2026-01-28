import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  ArrowRight,
  Building2,
  DollarSign,
  ShoppingCart,
  Clock,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ExportDialog, type ExportOption } from '@/components/analytics/ExportDialog';
import { exportCustomerHealthReport, type CustomerHealthData } from '@/utils/analyticsExport';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/hooks/useOrdersQuery';
import type { Customer } from '@/hooks/useCustomersQuery';

interface CustomerHealthScore {
  customerId: string;
  customerName: string;
  health: 'green' | 'yellow' | 'red';
  score: number;
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  daysSinceLastOrder: number;
  paymentBehavior: 'excellent' | 'good' | 'poor';
  orderTrend: 'growing' | 'stable' | 'declining';
  issueFrequency: 'low' | 'medium' | 'high';
  explanation: string;
}

interface CustomerIntelligenceProps {
  orders: Order[];
  customers: Customer[];
}

export const CustomerIntelligence: React.FC<CustomerIntelligenceProps> = ({
  orders,
  customers
}) => {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const { toast } = useToast();

  const customerMetrics = React.useMemo(() => {
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const metrics: CustomerHealthScore[] = customers.map(customer => {
      const customerOrders = orders.filter(o => o.customer_id === customer.id);
      const deliveredOrders = customerOrders.filter(o => o.status === 'delivered');
      const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const orderCount = customerOrders.length;
      const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
      
      // Days since last order
      let daysSinceLastOrder = Infinity;
      const sortedOrders = customerOrders
        .filter(o => o.created_at)
        .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
      
      if (sortedOrders.length > 0) {
        daysSinceLastOrder = Math.floor(
          (now.getTime() - new Date(sortedOrders[0].created_at!).getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      // Payment behavior
      const pendingPayments = customerOrders.filter(o => 
        o.status === 'pending_payment' || 
        (o.status === 'processing' && !o.payment_verified_at)
      );
      const paymentBehavior: 'excellent' | 'good' | 'poor' = 
        pendingPayments.length === 0 ? 'excellent' :
        pendingPayments.length <= 1 ? 'good' : 'poor';

      // Order trend (last 3 months vs previous 3 months)
      const recentOrders = customerOrders.filter(o => 
        o.created_at && new Date(o.created_at) > ninetyDaysAgo
      );
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const previousOrders = customerOrders.filter(o => 
        o.created_at && 
        new Date(o.created_at) <= ninetyDaysAgo && 
        new Date(o.created_at) > sixMonthsAgo
      );
      
      const orderTrend: 'growing' | 'stable' | 'declining' = 
        recentOrders.length > previousOrders.length * 1.2 ? 'growing' :
        recentOrders.length < previousOrders.length * 0.8 ? 'declining' : 'stable';

      // Issue frequency (based on failed deliveries)
      const issuesCount = customerOrders.filter(o => 
        (o.failed_delivery_count && o.failed_delivery_count > 0) ||
        o.status === 'cancelled'
      ).length;
      const issueFrequency: 'low' | 'medium' | 'high' = 
        issuesCount === 0 ? 'low' :
        issuesCount <= 2 ? 'medium' : 'high';

      // Calculate health score (0-100)
      let score = 50;
      
      // Payment behavior (+/- 20)
      score += paymentBehavior === 'excellent' ? 20 : paymentBehavior === 'good' ? 10 : -10;
      
      // Recency (+/- 15)
      score += daysSinceLastOrder < 30 ? 15 : daysSinceLastOrder < 60 ? 5 : daysSinceLastOrder < 90 ? -5 : -15;
      
      // Order trend (+/- 10)
      score += orderTrend === 'growing' ? 10 : orderTrend === 'declining' ? -10 : 0;
      
      // Issue frequency (+/- 5)
      score += issueFrequency === 'low' ? 5 : issueFrequency === 'high' ? -5 : 0;

      score = Math.max(0, Math.min(100, score));

      const health: 'green' | 'yellow' | 'red' = 
        score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red';

      // Generate explanation
      let explanation = '';
      if (health === 'green') {
        explanation = `Active customer with ${paymentBehavior} payment history. ${orderTrend === 'growing' ? 'Order volume increasing.' : ''}`;
      } else if (health === 'yellow') {
        const issues = [];
        if (daysSinceLastOrder > 60) issues.push('No recent orders');
        if (paymentBehavior === 'poor') issues.push('Payment delays');
        if (orderTrend === 'declining') issues.push('Order frequency declining');
        explanation = issues.join('. ') + '. Consider proactive outreach.';
      } else {
        const issues = [];
        if (daysSinceLastOrder > 90) issues.push('Inactive for 90+ days');
        if (paymentBehavior === 'poor') issues.push('Multiple payment issues');
        if (issueFrequency === 'high') issues.push('High issue frequency');
        explanation = issues.join('. ') + '. High churn risk.';
      }

      return {
        customerId: customer.id,
        customerName: customer.company_name,
        health,
        score,
        totalRevenue,
        orderCount,
        avgOrderValue,
        daysSinceLastOrder,
        paymentBehavior,
        orderTrend,
        issueFrequency,
        explanation
      };
    });

    return metrics
      .filter(m => m.orderCount > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [orders, customers]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `GHS ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `GHS ${(value / 1000).toFixed(0)}K`;
    return `GHS ${value.toFixed(0)}`;
  };

  const getHealthStyles = (health: CustomerHealthScore['health']) => {
    switch (health) {
      case 'green':
        return {
          bg: 'bg-green-100 dark:bg-green-900/20',
          text: 'text-green-700 dark:text-green-400',
          border: 'border-l-green-500'
        };
      case 'yellow':
        return {
          bg: 'bg-amber-100 dark:bg-amber-900/20',
          text: 'text-amber-700 dark:text-amber-400',
          border: 'border-l-amber-500'
        };
      case 'red':
        return {
          bg: 'bg-red-100 dark:bg-red-900/20',
          text: 'text-red-700 dark:text-red-400',
          border: 'border-l-red-500'
        };
    }
  };

  const getTrendIcon = (trend: CustomerHealthScore['orderTrend']) => {
    switch (trend) {
      case 'growing':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return null;
    }
  };

  const topCustomers = customerMetrics.slice(0, 5);
  const atRiskCustomers = customerMetrics.filter(c => c.health === 'red' || c.health === 'yellow');
  const growingCustomers = customerMetrics.filter(c => c.orderTrend === 'growing');

  const handleExport = async (options: ExportOption[]) => {
    try {
      for (const option of options) {
        if (option === 'customer_health') {
          const exportData: CustomerHealthData[] = customerMetrics.map(c => ({
            customerId: c.customerId,
            customerName: c.customerName,
            health: c.health,
            score: c.score,
            totalRevenue: c.totalRevenue,
            orderCount: c.orderCount,
            avgOrderValue: c.avgOrderValue,
            daysSinceLastOrder: c.daysSinceLastOrder === Infinity ? 9999 : c.daysSinceLastOrder,
            paymentBehavior: c.paymentBehavior,
            orderTrend: c.orderTrend,
            explanation: c.explanation
          }));
          exportCustomerHealthReport(exportData);
        }
      }
      toast({
        title: "Export Complete",
        description: "Customer health data exported successfully"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting data",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setExportDialogOpen(true)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customerMetrics.filter(c => c.health === 'green').length}</p>
                <p className="text-xs text-muted-foreground">Healthy Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/20">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{atRiskCustomers.length}</p>
                <p className="text-xs text-muted-foreground">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{growingCustomers.length}</p>
                <p className="text-xs text-muted-foreground">Growing Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Customers by Revenue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Top Customers by Revenue
            </CardTitle>
            <CardDescription>Highest value accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {topCustomers.map((customer, index) => {
                  const styles = getHealthStyles(customer.health);
                  return (
                    <motion.div
                      key={customer.customerId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'p-3 rounded-lg border border-l-4 hover:bg-muted/50 transition-colors',
                        styles.border
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {customer.customerName}
                            </span>
                            <Badge className={cn('text-xs', styles.bg, styles.text)}>
                              {customer.health === 'green' ? 'Healthy' : 
                               customer.health === 'yellow' ? 'Attention' : 'At Risk'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {formatCurrency(customer.totalRevenue)}
                            </span>
                            <span>{customer.orderCount} orders</span>
                            <span className="flex items-center gap-1">
                              {getTrendIcon(customer.orderTrend)}
                              {customer.orderTrend}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* At Risk Customers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Customers Needing Attention
            </CardTitle>
            <CardDescription>Review and take action</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {atRiskCustomers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">All customers are healthy!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {atRiskCustomers.slice(0, 8).map((customer, index) => {
                    const styles = getHealthStyles(customer.health);
                    return (
                      <motion.div
                        key={customer.customerId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          'p-3 rounded-lg border border-l-4',
                          styles.border
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium text-sm">{customer.customerName}</span>
                          <Badge className={cn('text-xs', styles.bg, styles.text)}>
                            Score: {customer.score}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {customer.explanation}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {customer.daysSinceLastOrder === Infinity 
                              ? 'No orders' 
                              : `${customer.daysSinceLastOrder}d ago`}
                          </span>
                          <span>{formatCurrency(customer.totalRevenue)} total</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Growth Opportunities */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Growth Opportunities
          </CardTitle>
          <CardDescription>Customers increasing order volume - consider expanding relationship</CardDescription>
        </CardHeader>
        <CardContent>
          {growingCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No clear growth patterns detected yet.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {growingCustomers.slice(0, 6).map((customer, index) => (
                <motion.div
                  key={customer.customerId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 rounded-lg border border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm truncate">{customer.customerName}</span>
                    <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Revenue: {formatCurrency(customer.totalRevenue)}</p>
                    <p>Avg Order: {formatCurrency(customer.avgOrderValue)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        availableOptions={['customer_health']}
        title="Export Customer Data"
        description="Download customer health scores and metrics"
      />
    </div>
  );
};
