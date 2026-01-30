import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  UserX, 
  User,
  RefreshCw,
  Download
} from 'lucide-react';
import { useOrdersQuery } from '@/hooks/useOrdersQuery';
import { useAuth } from '@/contexts/AuthContext';
import { OperationsQueueRow } from '@/components/operations/OperationsQueueRow';
import { WorkloadSummary } from '@/components/operations/WorkloadSummary';
import { 
  calculateSLA, 
  filterActiveOrders, 
  sortByUrgency, 
  countBySLAStatus,
  isOrderAtRisk
} from '@/utils/slaHelpers';
import type { Order } from '@/hooks/useOrdersQuery';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BulkAssignDialog } from '@/components/bulk/BulkAssignDialog';

type QueueTab = 'awaiting_payment' | 'awaiting_processing' | 'at_risk' | 'unassigned' | 'my_queue';

export default function OperationsHub() {
  const { orders, isLoading, refetch } = useOrdersQuery();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<QueueTab>('at_risk');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  
  // Filter orders for each queue
  const queues = useMemo(() => {
    const activeOrders = filterActiveOrders(orders);
    
    return {
      awaiting_payment: activeOrders.filter(o => o.status === 'pending_payment'),
      awaiting_processing: activeOrders.filter(o => 
        ['order_confirmed', 'payment_received'].includes(o.status)
      ),
      at_risk: sortByUrgency(activeOrders.filter(isOrderAtRisk)),
      unassigned: activeOrders.filter(o => !o.assigned_to),
      my_queue: sortByUrgency(activeOrders.filter(o => o.assigned_to === user?.id)),
    };
  }, [orders, user?.id]);
  
  // KPI calculations
  const kpis = useMemo(() => {
    const activeOrders = filterActiveOrders(orders);
    const slaStats = countBySLAStatus(orders);
    
    // Calculate avg days to complete (from orders that are delivered)
    const deliveredOrders = orders.filter(o => o.status === 'delivered' && o.created_at && o.delivered_at);
    const avgDaysToComplete = deliveredOrders.length > 0
      ? Math.round(
          deliveredOrders.reduce((acc, o) => {
            const created = new Date(o.created_at!);
            const delivered = new Date(o.delivered_at!);
            return acc + Math.ceil((delivered.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          }, 0) / deliveredOrders.length
        )
      : 0;
    
    return {
      totalActive: activeOrders.length,
      atRisk: slaStats.at_risk + slaStats.breached,
      unassigned: activeOrders.filter(o => !o.assigned_to).length,
      avgDaysToComplete,
    };
  }, [orders]);
  
  const currentQueueOrders = queues[activeTab];
  
  // Selection handlers
  const toggleSelectItem = (orderId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };
  
  const toggleSelectAll = () => {
    if (selectedIds.size === currentQueueOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentQueueOrders.map(o => o.id)));
    }
  };
  
  const clearSelection = () => setSelectedIds(new Set());
  
  // Handle row action
  const handleAction = async (order: Order, action: string) => {
    switch (action) {
      case 'verify_payment':
        navigate(`/admin/orders?viewId=${order.id}&tab=payment`);
        break;
      case 'start_processing':
        try {
          const { error } = await supabase
            .from('orders')
            .update({ 
              status: 'processing',
              processing_started_at: new Date().toISOString()
            })
            .eq('id', order.id);
          
          if (error) throw error;
          toast({ title: 'Order moved to processing' });
          refetch();
        } catch (error: any) {
          toast({ 
            title: 'Update failed', 
            description: error.message,
            variant: 'destructive'
          });
        }
        break;
      case 'mark_ready':
        try {
          const { error } = await supabase
            .from('orders')
            .update({ 
              status: 'ready_to_ship',
              ready_to_ship_at: new Date().toISOString()
            })
            .eq('id', order.id);
          
          if (error) throw error;
          toast({ title: 'Order marked as ready to ship' });
          refetch();
        } catch (error: any) {
          toast({ 
            title: 'Update failed', 
            description: error.message,
            variant: 'destructive'
          });
        }
        break;
      case 'mark_shipped':
        navigate(`/admin/orders?viewId=${order.id}&tab=shipping`);
        break;
      case 'view_tracking':
        navigate(`/admin/orders?viewId=${order.id}&tab=tracking`);
        break;
      default:
        navigate(`/admin/orders?viewId=${order.id}`);
    }
  };
  
  const selectedOrders = currentQueueOrders.filter(o => selectedIds.has(o.id));
  
  const tabCounts: Record<QueueTab, number> = {
    awaiting_payment: queues.awaiting_payment.length,
    awaiting_processing: queues.awaiting_processing.length,
    at_risk: queues.at_risk.length,
    unassigned: queues.unassigned.length,
    my_queue: queues.my_queue.length,
  };
  
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operations Hub</h1>
          <p className="text-muted-foreground">Queue-based order management</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Active Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis.totalActive}</p>
          </CardContent>
        </Card>
        
        <Card className={kpis.atRisk > 0 ? 'border-red-500/50 bg-red-500/5' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className={cn(
              'text-sm font-medium flex items-center gap-2',
              kpis.atRisk > 0 ? 'text-red-500' : 'text-muted-foreground'
            )}>
              <AlertTriangle className="h-4 w-4" />
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn(
              'text-2xl font-bold',
              kpis.atRisk > 0 && 'text-red-500'
            )}>
              {kpis.atRisk}
            </p>
          </CardContent>
        </Card>
        
        <Card className={kpis.unassigned > 5 ? 'border-amber-500/50 bg-amber-500/5' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className={cn(
              'text-sm font-medium flex items-center gap-2',
              kpis.unassigned > 5 ? 'text-amber-500' : 'text-muted-foreground'
            )}>
              <UserX className="h-4 w-4" />
              Unassigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn(
              'text-2xl font-bold',
              kpis.unassigned > 5 && 'text-amber-500'
            )}>
              {kpis.unassigned}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {kpis.avgDaysToComplete > 0 ? `${kpis.avgDaysToComplete}d` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Main Queue Area */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={(v) => {
                setActiveTab(v as QueueTab);
                clearSelection();
              }}>
                <div className="border-b px-4 pt-4">
                  <TabsList className="grid grid-cols-5 w-full">
                    <TabsTrigger value="at_risk" className="text-xs sm:text-sm">
                      At Risk
                      {tabCounts.at_risk > 0 && (
                        <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-xs">
                          {tabCounts.at_risk}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="awaiting_payment" className="text-xs sm:text-sm">
                      Payment
                      {tabCounts.awaiting_payment > 0 && (
                        <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                          {tabCounts.awaiting_payment}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="awaiting_processing" className="text-xs sm:text-sm">
                      Processing
                      {tabCounts.awaiting_processing > 0 && (
                        <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                          {tabCounts.awaiting_processing}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="unassigned" className="text-xs sm:text-sm">
                      Unassigned
                      {tabCounts.unassigned > 0 && (
                        <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-xs">
                          {tabCounts.unassigned}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="my_queue" className="text-xs sm:text-sm">
                      <User className="h-3 w-3 mr-1" />
                      My Queue
                      {tabCounts.my_queue > 0 && (
                        <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                          {tabCounts.my_queue}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                {/* Bulk action toolbar */}
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-primary/5 border-b">
                    <span className="text-sm font-medium">
                      {selectedIds.size} selected
                    </span>
                    <div className="flex-1" />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAssignDialog(true)}
                    >
                      Assign
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      Clear
                    </Button>
                  </div>
                )}
                
                <TabsContent value={activeTab} className="m-0">
                  {currentQueueOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">Queue is empty</p>
                      <p className="text-sm">No orders require attention in this queue</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedIds.size === currentQueueOrders.length && currentQueueOrders.length > 0}
                                onCheckedChange={toggleSelectAll}
                              />
                            </TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>SLA</TableHead>
                            <TableHead>Assignee</TableHead>
                            <TableHead>Days</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentQueueOrders.map(order => (
                            <OperationsQueueRow
                              key={order.id}
                              order={order}
                              onAction={handleAction}
                              isSelected={selectedIds.has(order.id)}
                              onToggleSelect={toggleSelectItem}
                              showAssignee={activeTab !== 'my_queue'}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar - Workload Summary */}
        <div className="lg:col-span-1">
          <WorkloadSummary orders={orders} />
        </div>
      </div>
      
      {/* Bulk Assign Dialog */}
      <BulkAssignDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        selectedOrders={selectedOrders.map(o => ({
          id: o.id,
          order_number: o.order_number,
          assigned_to: o.assigned_to || undefined
        }))}
        onComplete={() => {
          refetch();
          clearSelection();
        }}
      />
    </div>
  );
}
