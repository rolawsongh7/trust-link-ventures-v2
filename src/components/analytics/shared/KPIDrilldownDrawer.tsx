import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ExternalLink, 
  DollarSign, 
  AlertTriangle, 
  Users, 
  TrendingUp,
  Clock,
  Building2,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Order } from '@/hooks/useOrdersQuery';
import type { Customer } from '@/hooks/useCustomersQuery';

export type KPIType = 'cash-at-risk' | 'orders-at-risk' | 'customer-risk' | 'growth-opportunities';

interface CustomerWithMetrics {
  id: string;
  company_name: string;
  health?: 'green' | 'yellow' | 'red';
  daysSinceLastOrder?: number;
  totalRevenue?: number;
}

interface KPIDrilldownDrawerProps {
  open: boolean;
  onClose: () => void;
  type: KPIType;
  orders: Order[];
  customers: Customer[];
}

export const KPIDrilldownDrawer: React.FC<KPIDrilldownDrawerProps> = ({
  open,
  onClose,
  type,
  orders,
  customers
}) => {
  const navigate = useNavigate();

  const getTitle = () => {
    switch (type) {
      case 'cash-at-risk': return 'Cash at Risk';
      case 'orders-at-risk': return 'Orders at Risk';
      case 'customer-risk': return 'Customers at Risk';
      case 'growth-opportunities': return 'Growth Opportunities';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'cash-at-risk': return 'Orders pending payment that need attention';
      case 'orders-at-risk': return 'Orders delayed or stuck in processing';
      case 'customer-risk': return 'Customers with declining activity';
      case 'growth-opportunities': return 'Customers increasing order volume';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'cash-at-risk': return DollarSign;
      case 'orders-at-risk': return AlertTriangle;
      case 'customer-risk': return Users;
      case 'growth-opportunities': return TrendingUp;
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `GHS ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `GHS ${(value / 1000).toFixed(0)}K`;
    return `GHS ${value.toFixed(0)}`;
  };

  // Get filtered data based on type
  const getFilteredOrders = (): Order[] => {
    switch (type) {
      case 'cash-at-risk':
        return orders.filter(o => 
          o.status === 'pending_payment' || 
          (o.status === 'processing' && !o.payment_verified_at)
        ).slice(0, 10);
      case 'orders-at-risk':
        return orders.filter(o => {
          const isDelayed = o.estimated_delivery_date && 
            new Date(o.estimated_delivery_date) < new Date() && 
            o.status !== 'delivered';
          const hasIssue = o.failed_delivery_count && o.failed_delivery_count > 0;
          const stuckInProcessing = o.status === 'processing' && o.created_at && 
            (Date.now() - new Date(o.created_at).getTime()) > (5 * 24 * 60 * 60 * 1000);
          return isDelayed || hasIssue || stuckInProcessing;
        }).slice(0, 10);
      default:
        return [];
    }
  };

  const getFilteredCustomers = (): CustomerWithMetrics[] => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const customerOrderCounts: Record<string, { total: number; lastOrder?: Date; recentRevenue: number; previousRevenue: number }> = {};
    
    orders.forEach(o => {
      if (!o.customer_id) return;
      if (!customerOrderCounts[o.customer_id]) {
        customerOrderCounts[o.customer_id] = { total: 0, recentRevenue: 0, previousRevenue: 0 };
      }
      customerOrderCounts[o.customer_id].total++;
      
      if (o.created_at) {
        const orderDate = new Date(o.created_at);
        if (!customerOrderCounts[o.customer_id].lastOrder || 
            orderDate > customerOrderCounts[o.customer_id].lastOrder!) {
          customerOrderCounts[o.customer_id].lastOrder = orderDate;
        }
        
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        if (orderDate > threeMonthsAgo) {
          customerOrderCounts[o.customer_id].recentRevenue += o.total_amount || 0;
        } else if (orderDate > sixMonthsAgo) {
          customerOrderCounts[o.customer_id].previousRevenue += o.total_amount || 0;
        }
      }
    });

    switch (type) {
      case 'customer-risk':
        return customers
          .filter(c => {
            const data = customerOrderCounts[c.id];
            if (!data || data.total < 2) return false;
            if (!data.lastOrder) return false;
            return data.lastOrder < ninetyDaysAgo;
          })
          .map(c => {
            const data = customerOrderCounts[c.id];
            return {
              id: c.id,
              company_name: c.company_name,
              health: 'red' as const,
              daysSinceLastOrder: data?.lastOrder 
                ? Math.floor((Date.now() - data.lastOrder.getTime()) / (1000 * 60 * 60 * 24))
                : undefined
            };
          })
          .slice(0, 10);
      
      case 'growth-opportunities':
        return customers
          .filter(c => {
            const data = customerOrderCounts[c.id];
            if (!data) return false;
            return data.previousRevenue > 0 && data.recentRevenue > data.previousRevenue * 1.2;
          })
          .map(c => {
            const data = customerOrderCounts[c.id];
            return {
              id: c.id,
              company_name: c.company_name,
              health: 'green' as const,
              totalRevenue: data?.recentRevenue
            };
          })
          .slice(0, 10);
      
      default:
        return [];
    }
  };

  const handleViewAll = () => {
    onClose();
    if (type === 'cash-at-risk' || type === 'orders-at-risk') {
      navigate('/admin/orders');
    } else {
      navigate('/admin/customers');
    }
  };

  const handleViewOrder = (orderId: string) => {
    onClose();
    navigate('/admin/orders', { state: { highlightOrderId: orderId } });
  };

  const handleViewCustomer = (customerId: string) => {
    onClose();
    navigate('/admin/customers', { state: { viewCustomerId: customerId } });
  };

  const Icon = getIcon();
  const filteredOrders = getFilteredOrders();
  const filteredCustomers = getFilteredCustomers();
  const isOrderType = type === 'cash-at-risk' || type === 'orders-at-risk';
  const isEmpty = isOrderType ? filteredOrders.length === 0 : filteredCustomers.length === 0;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {getTitle()}
          </SheetTitle>
          <SheetDescription>{getDescription()}</SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isEmpty ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="font-medium text-foreground">All Clear!</p>
              <p className="text-sm text-muted-foreground mt-1">
                No items need attention in this category
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-3 pr-4">
                {isOrderType ? (
                  filteredOrders.map((order) => {
                    const daysPending = order.created_at 
                      ? Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24))
                      : 0;
                    
                    return (
                      <div
                        key={order.id}
                        className="p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="font-medium">{order.order_number}</span>
                            <Badge 
                              variant="outline" 
                              className="ml-2 text-xs"
                            >
                              {order.status?.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <span className="font-semibold text-primary">
                            {formatCurrency(order.total_amount || 0)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {daysPending}d pending
                          </span>
                          {order.failed_delivery_count && order.failed_delivery_count > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {order.failed_delivery_count} failed delivery
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className={cn(
                        "p-4 rounded-lg border-l-4 border hover:bg-muted/50 transition-colors cursor-pointer",
                        customer.health === 'red' ? 'border-l-destructive' : 
                        customer.health === 'green' ? 'border-l-primary' : 'border-l-warning'
                      )}
                      onClick={() => handleViewCustomer(customer.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <span className="font-medium">{customer.company_name}</span>
                          <div className="text-xs text-muted-foreground mt-1">
                            {customer.daysSinceLastOrder !== undefined && (
                              <span>Last order: {customer.daysSinceLastOrder} days ago</span>
                            )}
                            {customer.totalRevenue !== undefined && (
                              <span>Recent revenue: {formatCurrency(customer.totalRevenue)}</span>
                            )}
                          </div>
                        </div>
                        {type === 'growth-opportunities' && (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}

          {!isEmpty && (
            <div className="mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleViewAll}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View All in {isOrderType ? 'Orders' : 'Customers'}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
