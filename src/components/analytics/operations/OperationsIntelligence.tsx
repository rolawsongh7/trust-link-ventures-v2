import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Timer,
  BarChart3,
  Download,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ExportDialog, type ExportOption } from '@/components/analytics/ExportDialog';
import { exportOperationsReport } from '@/utils/analyticsExport';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/hooks/useOrdersQuery';

interface OperationsIntelligenceProps {
  orders: Order[];
}

interface BottleneckData {
  stage: string;
  avgDays: number;
  orderCount: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface IssuePattern {
  type: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  recentOrders: string[];
}

export const OperationsIntelligence: React.FC<OperationsIntelligenceProps> = ({
  orders
}) => {
  const navigate = useNavigate();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleViewOrder = (orderId: string) => {
    navigate('/admin/orders', { state: { highlightOrderId: orderId } });
  };

  // Calculate order cycle time metrics
  const cycleMetrics = React.useMemo(() => {
    const completedOrders = orders.filter(o => 
      o.status === 'delivered' && o.created_at && o.delivered_at
    );

    if (completedOrders.length === 0) {
      return { avgCycleTime: 0, minCycleTime: 0, maxCycleTime: 0, onTimeRate: 0 };
    }

    const cycleTimes = completedOrders.map(o => {
      const created = new Date(o.created_at!).getTime();
      const delivered = new Date(o.delivered_at!).getTime();
      return (delivered - created) / (1000 * 60 * 60 * 24);
    });

    const avgCycleTime = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
    const minCycleTime = Math.min(...cycleTimes);
    const maxCycleTime = Math.max(...cycleTimes);

    // On-time delivery rate
    const onTimeOrders = completedOrders.filter(o => {
      if (!o.estimated_delivery_date || !o.delivered_at) return true;
      return new Date(o.delivered_at) <= new Date(o.estimated_delivery_date);
    });
    const onTimeRate = (onTimeOrders.length / completedOrders.length) * 100;

    return { avgCycleTime, minCycleTime, maxCycleTime, onTimeRate };
  }, [orders]);

  // Bottleneck detection
  const bottlenecks = React.useMemo((): BottleneckData[] => {
    const stageData: Record<string, { totalDays: number; count: number }> = {};
    
    // Calculate time spent in each stage
    const stages = [
      { key: 'pending_payment', label: 'Payment Pending' },
      { key: 'processing', label: 'Processing' },
      { key: 'ready_to_ship', label: 'Ready to Ship' },
      { key: 'shipped', label: 'In Transit' }
    ];

    orders.forEach(o => {
      if (!o.created_at) return;
      
      const created = new Date(o.created_at);
      const now = new Date();
      
      // For current status, calculate time in that stage
      if (stages.some(s => s.key === o.status)) {
        const stageKey = o.status;
        if (!stageData[stageKey]) {
          stageData[stageKey] = { totalDays: 0, count: 0 };
        }
        
        // Estimate time in current stage
        let stageStart = created;
        if (o.status === 'processing' && o.payment_verified_at) {
          stageStart = new Date(o.payment_verified_at);
        } else if (o.status === 'ready_to_ship' && o.ready_to_ship_at) {
          stageStart = new Date(o.ready_to_ship_at);
        } else if (o.status === 'shipped' && o.shipped_at) {
          stageStart = new Date(o.shipped_at);
        }
        
        const daysInStage = (now.getTime() - stageStart.getTime()) / (1000 * 60 * 60 * 24);
        stageData[stageKey].totalDays += daysInStage;
        stageData[stageKey].count++;
      }
    });

    // Define expected times per stage
    const expectedTimes: Record<string, number> = {
      'pending_payment': 3,
      'processing': 2,
      'ready_to_ship': 1,
      'shipped': 5
    };

    return stages.map(stage => {
      const data = stageData[stage.key] || { totalDays: 0, count: 0 };
      const avgDays = data.count > 0 ? data.totalDays / data.count : 0;
      const expected = expectedTimes[stage.key] || 2;
      
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (avgDays > expected * 2) status = 'critical';
      else if (avgDays > expected * 1.5) status = 'warning';

      return {
        stage: stage.label,
        avgDays,
        orderCount: data.count,
        status
      };
    });
  }, [orders]);

  // Issue patterns
  const issuePatterns = React.useMemo((): IssuePattern[] => {
    const patterns: IssuePattern[] = [];
    
    // Delivery failures
    const failedDeliveries = orders.filter(o => 
      o.failed_delivery_count && o.failed_delivery_count > 0
    );
    if (failedDeliveries.length > 0) {
      patterns.push({
        type: 'Failed Deliveries',
        count: failedDeliveries.length,
        trend: 'stable',
        recentOrders: failedDeliveries.slice(0, 3).map(o => o.order_number)
      });
    }

    // Cancelled orders
    const cancelled = orders.filter(o => o.status === 'cancelled');
    if (cancelled.length > 0) {
      patterns.push({
        type: 'Cancelled Orders',
        count: cancelled.length,
        trend: 'stable',
        recentOrders: cancelled.slice(0, 3).map(o => o.order_number)
      });
    }

    // Payment delays (pending > 7 days)
    const paymentDelays = orders.filter(o => {
      if (o.status !== 'pending_payment' || !o.created_at) return false;
      const daysPending = (Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysPending > 7;
    });
    if (paymentDelays.length > 0) {
      patterns.push({
        type: 'Payment Delays (>7 days)',
        count: paymentDelays.length,
        trend: 'up',
        recentOrders: paymentDelays.slice(0, 3).map(o => o.order_number)
      });
    }

    return patterns;
  }, [orders]);

  // Orders at risk (likely to miss SLA)
  const ordersAtRisk = React.useMemo(() => {
    return orders.filter(o => {
      if (o.status === 'delivered' || o.status === 'cancelled') return false;
      if (!o.estimated_delivery_date) return false;
      
      const eta = new Date(o.estimated_delivery_date);
      const now = new Date();
      const daysUntilDue = (eta.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      // At risk if < 2 days until due and still processing or earlier
      if (daysUntilDue < 2 && ['pending_payment', 'processing', 'ready_to_ship'].includes(o.status)) {
        return true;
      }
      // Or already past due
      if (daysUntilDue < 0) return true;
      
      return false;
    });
  }, [orders]);

  const getStatusColor = (status: BottleneckData['status']) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-amber-500';
      case 'critical': return 'bg-red-500';
    }
  };

  const getStatusBadge = (status: BottleneckData['status']) => {
    switch (status) {
      case 'healthy': 
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30">On Track</Badge>;
      case 'warning': 
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30">Slow</Badge>;
      case 'critical': 
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30">Bottleneck</Badge>;
    }
  };

  const handleExport = async (options: ExportOption[]) => {
    try {
      for (const option of options) {
        if (option === 'operations_report') {
          exportOperationsReport(orders);
        }
        if (option === 'at_risk_orders' && ordersAtRisk.length > 0) {
          const { exportAtRiskOrders } = await import('@/utils/analyticsExport');
          exportAtRiskOrders(ordersAtRisk);
        }
      }
      toast({
        title: "Export Complete",
        description: "Operations data exported successfully"
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

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Timer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cycleMetrics.avgCycleTime.toFixed(1)}d</p>
                <p className="text-xs text-muted-foreground">Avg Cycle Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                cycleMetrics.onTimeRate >= 90 ? 'bg-green-100 dark:bg-green-900/20' :
                cycleMetrics.onTimeRate >= 75 ? 'bg-amber-100 dark:bg-amber-900/20' :
                'bg-red-100 dark:bg-red-900/20'
              )}>
                <CheckCircle className={cn(
                  "h-5 w-5",
                  cycleMetrics.onTimeRate >= 90 ? 'text-green-600' :
                  cycleMetrics.onTimeRate >= 75 ? 'text-amber-600' : 'text-red-600'
                )} />
              </div>
              <div>
                <p className="text-2xl font-bold">{cycleMetrics.onTimeRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">On-Time Delivery</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                ordersAtRisk.length === 0 ? 'bg-green-100 dark:bg-green-900/20' :
                ordersAtRisk.length <= 3 ? 'bg-amber-100 dark:bg-amber-900/20' :
                'bg-red-100 dark:bg-red-900/20'
              )}>
                <AlertTriangle className={cn(
                  "h-5 w-5",
                  ordersAtRisk.length === 0 ? 'text-green-600' :
                  ordersAtRisk.length <= 3 ? 'text-amber-600' : 'text-red-600'
                )} />
              </div>
              <div>
                <p className="text-2xl font-bold">{ordersAtRisk.length}</p>
                <p className="text-xs text-muted-foreground">Orders at Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}
                </p>
                <p className="text-xs text-muted-foreground">Active Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bottleneck Analysis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Process Bottlenecks
            </CardTitle>
            <CardDescription>Where orders are getting stuck</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bottlenecks.map((bottleneck, index) => (
                <motion.div
                  key={bottleneck.stage}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{bottleneck.stage}</span>
                      {getStatusBadge(bottleneck.status)}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {bottleneck.orderCount} orders · {bottleneck.avgDays.toFixed(1)}d avg
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(bottleneck.avgDays * 10, 100)}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className={cn('h-full rounded-full', getStatusColor(bottleneck.status))}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Issue Patterns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Issue Patterns
            </CardTitle>
            <CardDescription>Recurring operational issues</CardDescription>
          </CardHeader>
          <CardContent>
            {issuePatterns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-50" />
                <p className="text-sm">No significant issues detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {issuePatterns.map((pattern, index) => (
                  <motion.div
                    key={pattern.type}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 rounded-lg border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{pattern.type}</span>
                        {pattern.trend === 'up' && (
                          <TrendingUp className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                      <Badge variant="secondary">{pattern.count} orders</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Recent: {pattern.recentOrders.join(', ')}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders at Risk */}
      {ordersAtRisk.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-600" />
              Orders Likely to Miss SLA
            </CardTitle>
            <CardDescription>These orders need immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {ordersAtRisk.map((order, index) => {
                  const eta = order.estimated_delivery_date 
                    ? new Date(order.estimated_delivery_date) 
                    : null;
                  const isOverdue = eta && eta < new Date();
                  
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/15 transition-colors"
                      onClick={() => handleViewOrder(order.id)}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{order.order_number}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewOrder(order.id);
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Badge variant="outline" className="text-xs">
                            {order.status.replace(/_/g, ' ')}
                          </Badge>
                          {eta && (
                            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {isOverdue ? 'Overdue' : `Due: ${eta.toLocaleDateString()}`}
                            </span>
                          )}
                        </div>
                      </div>
                      {isOverdue ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        availableOptions={['operations_report', 'at_risk_orders']}
        title="Export Operations Data"
        description="Download cycle times, bottleneck analysis, and at-risk orders"
      />
    </div>
  );
};
