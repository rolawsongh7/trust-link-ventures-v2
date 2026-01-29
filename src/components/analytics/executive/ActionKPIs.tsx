import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  AlertTriangle, 
  Users, 
  TrendingUp,
  ArrowRight,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPIDrilldownDrawer, type KPIType } from '../shared/KPIDrilldownDrawer';
import type { Order } from '@/hooks/useOrdersQuery';
import type { Customer } from '@/hooks/useCustomersQuery';

interface ActionKPI {
  id: KPIType;
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  urgency: 'critical' | 'warning' | 'opportunity' | 'neutral';
  trend?: 'up' | 'down' | 'stable';
  action?: string;
}

interface ActionKPIsProps {
  orders: Order[];
  customers: Customer[];
}

export const ActionKPIs: React.FC<ActionKPIsProps> = ({ orders, customers }) => {
  const [selectedKPI, setSelectedKPI] = useState<KPIType | null>(null);
  // Calculate Cash at Risk (overdue + delayed payments)
  const cashAtRisk = React.useMemo(() => {
    const pendingPaymentOrders = orders.filter(o => 
      o.status === 'pending_payment' || 
      (o.status === 'processing' && !o.payment_verified_at)
    );
    const total = pendingPaymentOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const overdueCount = pendingPaymentOrders.filter(o => {
      if (!o.created_at) return false;
      const daysSinceCreation = (Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreation > 7;
    }).length;
    return { total, count: pendingPaymentOrders.length, overdueCount };
  }, [orders]);

  // Calculate Orders at Risk (delays, missing docs, unresolved issues)
  const ordersAtRisk = React.useMemo(() => {
    const atRisk = orders.filter(o => {
      const isDelayed = o.estimated_delivery_date && 
        new Date(o.estimated_delivery_date) < new Date() && 
        o.status !== 'delivered';
      const hasIssue = o.failed_delivery_count && o.failed_delivery_count > 0;
      const stuckInProcessing = o.status === 'processing' && o.created_at && 
        (Date.now() - new Date(o.created_at).getTime()) > (5 * 24 * 60 * 60 * 1000);
      return isDelayed || hasIssue || stuckInProcessing;
    });
    return atRisk.length;
  }, [orders]);

  // Calculate Customer Risk Count (customers with declining orders)
  const customerRisk = React.useMemo(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const customerOrderCounts: Record<string, { recent: number; total: number; lastOrder?: Date }> = {};
    
    orders.forEach(o => {
      if (!o.customer_id) return;
      if (!customerOrderCounts[o.customer_id]) {
        customerOrderCounts[o.customer_id] = { recent: 0, total: 0 };
      }
      customerOrderCounts[o.customer_id].total++;
      if (o.created_at && new Date(o.created_at) > sixMonthsAgo) {
        customerOrderCounts[o.customer_id].recent++;
      }
      if (o.created_at) {
        const orderDate = new Date(o.created_at);
        if (!customerOrderCounts[o.customer_id].lastOrder || 
            orderDate > customerOrderCounts[o.customer_id].lastOrder!) {
          customerOrderCounts[o.customer_id].lastOrder = orderDate;
        }
      }
    });

    // Customers at risk: no orders in 90 days or declining order frequency
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    let atRisk = 0;
    Object.values(customerOrderCounts).forEach(({ recent, total, lastOrder }) => {
      if (total > 2 && recent === 0) atRisk++;
      else if (lastOrder && lastOrder < ninetyDaysAgo) atRisk++;
    });
    
    return atRisk;
  }, [orders]);

  // Calculate Growth Opportunities (customers increasing order volume)
  const growthOpportunities = React.useMemo(() => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const customerGrowth: Record<string, { recent: number; previous: number }> = {};
    
    orders.forEach(o => {
      if (!o.customer_id || !o.created_at) return;
      const orderDate = new Date(o.created_at);
      if (!customerGrowth[o.customer_id]) {
        customerGrowth[o.customer_id] = { recent: 0, previous: 0 };
      }
      if (orderDate > threeMonthsAgo) {
        customerGrowth[o.customer_id].recent += o.total_amount || 0;
      } else if (orderDate > sixMonthsAgo) {
        customerGrowth[o.customer_id].previous += o.total_amount || 0;
      }
    });

    // Customers with >20% growth
    let growing = 0;
    Object.values(customerGrowth).forEach(({ recent, previous }) => {
      if (previous > 0 && recent > previous * 1.2) growing++;
    });
    
    return growing;
  }, [orders]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `GHS ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `GHS ${(value / 1000).toFixed(0)}K`;
    return `GHS ${value.toFixed(0)}`;
  };

  const kpis: ActionKPI[] = [
    {
      id: 'cash-at-risk',
      label: 'Cash at Risk',
      value: formatCurrency(cashAtRisk.total),
      subValue: `${cashAtRisk.count} orders · ${cashAtRisk.overdueCount} overdue`,
      icon: DollarSign,
      urgency: cashAtRisk.overdueCount > 0 ? 'critical' : cashAtRisk.count > 0 ? 'warning' : 'neutral',
      action: 'Review payments'
    },
    {
      id: 'orders-at-risk',
      label: 'Orders at Risk',
      value: ordersAtRisk,
      subValue: 'Delays, issues, or stuck',
      icon: AlertTriangle,
      urgency: ordersAtRisk > 5 ? 'critical' : ordersAtRisk > 0 ? 'warning' : 'neutral',
      action: 'View orders'
    },
    {
      id: 'customer-risk',
      label: 'Customers at Risk',
      value: customerRisk,
      subValue: 'Declining or inactive',
      icon: Users,
      urgency: customerRisk > 3 ? 'warning' : 'neutral',
      action: 'Review customers'
    },
    {
      id: 'growth-opportunities',
      label: 'Growth Opportunities',
      value: growthOpportunities,
      subValue: 'Customers scaling up',
      icon: TrendingUp,
      urgency: 'opportunity',
      action: 'Explore opportunities'
    }
  ];

  const getUrgencyStyles = (urgency: ActionKPI['urgency']) => {
    switch (urgency) {
      case 'critical':
        return {
          border: 'border-l-4 border-l-red-500',
          iconBg: 'bg-red-100 dark:bg-red-900/20',
          iconColor: 'text-red-600 dark:text-red-400',
          badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        };
      case 'warning':
        return {
          border: 'border-l-4 border-l-amber-500',
          iconBg: 'bg-amber-100 dark:bg-amber-900/20',
          iconColor: 'text-amber-600 dark:text-amber-400',
          badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        };
      case 'opportunity':
        return {
          border: 'border-l-4 border-l-green-500',
          iconBg: 'bg-green-100 dark:bg-green-900/20',
          iconColor: 'text-green-600 dark:text-green-400',
          badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        };
      default:
        return {
          border: 'border-l-4 border-l-muted',
          iconBg: 'bg-muted',
          iconColor: 'text-muted-foreground',
          badge: 'bg-muted text-muted-foreground'
        };
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, index) => {
        const styles = getUrgencyStyles(kpi.urgency);
        const Icon = kpi.icon;
        
        return (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={cn('relative overflow-hidden hover:shadow-md transition-shadow', styles.border)}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('p-2.5 rounded-lg', styles.iconBg)}>
                    <Icon className={cn('h-5 w-5', styles.iconColor)} />
                  </div>
                  {kpi.urgency !== 'neutral' && (
                    <Badge variant="secondary" className={cn('text-xs', styles.badge)}>
                      {kpi.urgency === 'critical' ? 'Action Required' : 
                       kpi.urgency === 'warning' ? 'Attention' : 'Opportunity'}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1 mb-3">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight">{kpi.value}</p>
                  {kpi.subValue && (
                    <p className="text-xs text-muted-foreground">{kpi.subValue}</p>
                  )}
                </div>

                {kpi.action && (
                  <button 
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    onClick={() => setSelectedKPI(kpi.id)}
                  >
                    {kpi.action}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {/* KPI Drilldown Drawer */}
      <KPIDrilldownDrawer
        open={selectedKPI !== null}
        onClose={() => setSelectedKPI(null)}
        type={selectedKPI || 'cash-at-risk'}
        orders={orders}
        customers={customers}
      />
    </div>
  );
};
