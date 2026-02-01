// Customer Standing Orders Widget
// Phase 5.3: Customer portal view of their recurring orders

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  RefreshCw, 
  Clock, 
  Package,
  ChevronRight,
  Play,
  Pause,
} from 'lucide-react';
import { 
  useCustomerStandingOrders, 
  getFrequencyLabel,
  getStandingOrderStatusColor,
} from '@/hooks/useStandingOrders';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CustomerStandingOrdersWidgetProps {
  customerId: string;
  compact?: boolean;
}

export function CustomerStandingOrdersWidget({ 
  customerId, 
  compact = false 
}: CustomerStandingOrdersWidgetProps) {
  const { data: standingOrders, isLoading } = useCustomerStandingOrders(customerId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const activeOrders = standingOrders?.filter(o => o.status === 'active') || [];
  const pausedOrders = standingOrders?.filter(o => o.status === 'paused') || [];

  if (compact) {
    if (activeOrders.length === 0) return null;

    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {activeOrders.length} Active Subscription{activeOrders.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  Next: {format(new Date(activeOrders[0].next_scheduled_date), 'MMM d')}
                </p>
              </div>
            </div>
            <Link to="/portal/subscriptions">
              <Button variant="ghost" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!standingOrders || standingOrders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Standing Orders
          </CardTitle>
          <CardDescription>Set up recurring orders for regular deliveries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              No standing orders yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Contact your account manager to set up recurring deliveries
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Standing Orders
            </CardTitle>
            <CardDescription>Your recurring delivery schedules</CardDescription>
          </div>
          {activeOrders.length > 0 && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              {activeOrders.length} Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Active Orders */}
        {activeOrders.map((order) => (
          <div 
            key={order.id}
            className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Play className="h-3.5 w-3.5 text-green-600" />
                  <span className="font-medium text-sm">{order.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{getFrequencyLabel(order.frequency)}</span>
                  <span>•</span>
                  <span>{order.total_orders_generated} orders generated</span>
                </div>
              </div>
              <Badge className={getStandingOrderStatusColor(order.status)}>
                {order.status}
              </Badge>
            </div>
            
            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  Next: {format(new Date(order.next_scheduled_date), 'EEEE, MMM d, yyyy')}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(order.next_scheduled_date), { addSuffix: true })}
              </span>
            </div>
          </div>
        ))}

        {/* Paused Orders */}
        {pausedOrders.map((order) => (
          <div 
            key={order.id}
            className="p-3 rounded-lg border bg-muted/30 opacity-75"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Pause className="h-3.5 w-3.5 text-amber-600" />
                  <span className="font-medium text-sm">{order.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {getFrequencyLabel(order.frequency)} • Paused
                </p>
              </div>
              <Badge className={getStandingOrderStatusColor(order.status)}>
                {order.status}
              </Badge>
            </div>
            {order.paused_reason && (
              <p className="mt-2 text-xs text-muted-foreground">
                Reason: {order.paused_reason}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
