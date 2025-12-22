import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { OrderCardSkeleton } from '@/components/orders/OrderCardSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useOrdersQuery } from '@/hooks/useOrdersQuery';
import { OrdersDataTable } from './OrdersDataTable';
import { DeliveryManagementDialog } from './DeliveryManagementDialog';
import { EditOrderDetailsDialog } from './EditOrderDetailsDialog';
import OrderStatusHistory from './OrderStatusHistory';
import { PaymentConfirmationDialog } from './PaymentConfirmationDialog';
import { ViewRelatedQuoteDialog } from './ViewRelatedQuoteDialog';
import { VerifyPaymentDialog } from './VerifyPaymentDialog';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  delivery_address_id?: string;
  delivery_address_requested_at?: string;
  quote_id?: string;
  payment_reference?: string;
  notes?: string;
  customer_id: string;
  customers?: {
    company_name: string;
    contact_name?: string;
    email?: string;
  } | null;
  quotes?: {
    quote_number: string;
    title: string;
  } | null;
  customer_addresses?: {
    street_address: string;
    city: string;
    region: string;
    ghana_digital_address?: string;
  } | null;
  order_items: any[];
}

const UnifiedOrdersManagement = () => {
  const navigate = useNavigate();
  
  // Use React Query ONLY for data fetching with caching
  const { orders, isLoading: loading, refetch } = useOrdersQuery();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [editDetailsDialogOpen, setEditDetailsDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [viewQuoteDialogOpen, setViewQuoteDialogOpen] = useState(false);
  const [verifyPaymentDialogOpen, setVerifyPaymentDialogOpen] = useState(false);

  // Set up real-time subscription for notifications and auto-generation
  useEffect(() => {
    const subscription = supabase
      .channel('orders-notifications')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.success(`New order ${payload.new.order_number} created`);
            refetch();
          } else if (payload.eventType === 'UPDATE') {
            const oldStatus = payload.old?.status;
            const newStatus = payload.new?.status;
            const orderId = payload.new?.id;
            const orderNumber = payload.new?.order_number;
            
            if (oldStatus !== newStatus) {
              toast.info(`Order ${orderNumber} status updated to ${newStatus}`);
              refetch();
              
              // Auto-generate packing list when ready_to_ship
              if (newStatus === 'ready_to_ship' && oldStatus !== 'ready_to_ship') {
                console.log('[Admin] Auto-generating packing list for', orderNumber);
                toast.info('📄 Generating Packing List...');
                
                const { data, error } = await supabase.functions.invoke('generate-packing-list', {
                  body: { orderId }
                });
                
                if (error) {
                  console.error('[Admin] Packing list error:', error);
                  toast.error(`Failed to generate packing list: ${error.message}`);
                } else if (data?.success) {
                  toast.success(`✅ Packing List ${data.invoiceNumber} generated`);
                }
              }
              
              // Auto-generate commercial invoice when shipped
              if (newStatus === 'shipped' && oldStatus !== 'shipped') {
                console.log('[Admin] Auto-generating commercial invoice for', orderNumber);
                toast.info('📄 Generating Commercial Invoice...');
                
                const { data, error } = await supabase.functions.invoke('generate-commercial-invoice', {
                  body: { orderId }
                });
                
                if (error) {
                  console.error('[Admin] Commercial invoice error:', error);
                  toast.error(`Failed to generate invoice: ${error.message}`);
                } else if (data?.success) {
                  toast.success(`✅ Commercial Invoice ${data.invoiceNumber} generated`);
                }
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [refetch]);

  const handleEditDetails = (order: Order) => {
    setSelectedOrder(order);
    setEditDetailsDialogOpen(true);
  };

  const handleViewHistory = (order: Order) => {
    setSelectedOrder(order);
    setHistoryDialogOpen(true);
  };

  const handleRequestAddress = async (order: Order) => {
    try {
      const { error } = await supabase.functions.invoke('request-delivery-address', {
        body: {
          orderId: order.id,
          orderNumber: order.order_number,
          customerEmail: order.customers?.email,
          customerName: order.customers?.contact_name,
          companyName: order.customers?.company_name,
        },
      });

      if (error) throw error;

      await supabase
        .from('orders')
        .update({ delivery_address_requested_at: new Date().toISOString() })
        .eq('id', order.id);

      toast.success('Delivery address request sent to customer');
      refetch();
    } catch (error) {
      console.error('Error requesting delivery address:', error);
      toast.error('Failed to request delivery address');
    }
  };

  const handleConfirmPayment = async (order: Order) => {
    setSelectedOrder(order);
    setPaymentDialogOpen(true);
    
    // Auto-request address if payment is being confirmed and no address exists
    if (order.status === 'pending_payment' && !order.delivery_address_id && !order.delivery_address_requested_at) {
      try {
        const { error } = await supabase.functions.invoke('request-delivery-address', {
          body: {
            orderId: order.id,
            orderNumber: order.order_number,
            customerEmail: order.customers?.email,
            customerName: order.customers?.contact_name,
            companyName: order.customers?.company_name,
          },
        });

        if (!error) {
          await supabase
            .from('orders')
            .update({ delivery_address_requested_at: new Date().toISOString() })
            .eq('id', order.id);
          
          toast.success('Delivery address request sent to customer', {
            description: 'We\'ll notify you when the customer provides their address',
          });
        }
      } catch (error) {
        console.error('Error auto-requesting address:', error);
        // Don't block payment confirmation if address request fails
      }
    }
  };

  const handleSendTracking = async (order: Order) => {
    setSelectedOrder(order);
    setDeliveryDialogOpen(true);
  };

  const handleQuickStatusChange = async (order: Order, newStatus: 'processing' | 'ready_to_ship' | 'delivered') => {
    try {
      // Validate address for ready_to_ship
      if (newStatus === 'ready_to_ship' && !order.delivery_address_id) {
        toast.error('Cannot mark as ready to ship without delivery address. Please request address first.');
        return;
      }

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (error) {
        if (error.message.includes('Invalid order status transition')) {
          toast.error('Invalid status transition');
        } else if (error.message.includes('delivery address')) {
          toast.error('Delivery address required');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Order marked as ${newStatus.replace(/_/g, ' ')}`);
      refetch();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update order status');
    }
  };

  // Invoice generation is now fully automatic:
  // - Packing List: Auto-generated when order reaches "ready_to_ship" status
  // - Commercial Invoice: Auto-generated when order is marked as "shipped"
  // No manual intervention needed - handled by useRealtimeOrders hook

  const handleViewQuote = (order: Order) => {
    setSelectedOrder(order);
    setViewQuoteDialogOpen(true);
  };

  const handleVerifyPayment = (order: Order) => {
    setSelectedOrder(order);
    setVerifyPaymentDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'order_confirmed': return 'bg-cyan-100 text-cyan-800';
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
      case 'payment_received': return 'bg-emerald-100 text-emerald-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'ready_to_ship': return 'bg-indigo-100 text-indigo-800';
      case 'shipped': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'delivery_failed': return 'bg-rose-100 text-rose-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesTab = false;
    if (selectedTab === 'all') {
      matchesTab = true;
    } else if (selectedTab === 'manual') {
      matchesTab = !order.quote_id;
    } else if (selectedTab === 'auto') {
      matchesTab = !!order.quote_id;
    } else {
      matchesTab = order.status === selectedTab;
    }
    
    return matchesSearch && matchesTab;
  });

  const autoOrdersCount = orders.filter(o => !!o.quote_id).length;
  const pendingAddressCount = orders.filter(o => !o.delivery_address_id && ['payment_received', 'processing'].includes(o.status)).length;

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ animationDelay: `${i * 100}ms` }} className="animate-fade-in">
            <OrderCardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders Management</h1>
          <p className="text-muted-foreground">
            Track and manage all orders from accepted quotes
          </p>
        </div>
        {/* Removed "Create New Quote" button - orders are created from accepted quotes */}
      </div>

      {/* Warning Banner for Pending Addresses */}
      {pendingAddressCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                {pendingAddressCount} order{pendingAddressCount !== 1 ? 's' : ''} require{pendingAddressCount === 1 ? 's' : ''} delivery address before shipping
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="flex md:grid md:grid-cols-7 w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          <TabsTrigger value="all" className="flex-shrink-0 snap-center min-w-[100px] md:min-w-0">
            All ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="order_confirmed" className="flex-shrink-0 snap-center min-w-[100px] md:min-w-0">
            Confirmed
          </TabsTrigger>
          <TabsTrigger value="payment_received" className="flex-shrink-0 snap-center min-w-[100px] md:min-w-0">
            Payment
          </TabsTrigger>
          <TabsTrigger value="processing" className="flex-shrink-0 snap-center min-w-[100px] md:min-w-0">
            Processing
          </TabsTrigger>
          <TabsTrigger value="shipped" className="flex-shrink-0 snap-center min-w-[100px] md:min-w-0">
            Shipped
          </TabsTrigger>
          <TabsTrigger value="delivered" className="flex-shrink-0 snap-center min-w-[100px] md:min-w-0">
            Delivered
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                <p className="text-gray-500 mb-4">
                  Orders are automatically created when customers accept quotes.
                </p>
                <Button onClick={() => navigate('/quotes')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Quote to Get Started
                </Button>
              </CardContent>
            </Card>
          ) : (
            <OrdersDataTable
              orders={filteredOrders as any}
              onEditDetails={handleEditDetails}
              onViewHistory={handleViewHistory}
              onRequestAddress={handleRequestAddress}
              onConfirmPayment={handleConfirmPayment}
              onSendTracking={handleSendTracking}
              onViewQuote={handleViewQuote}
              onRefresh={refetch}
              
              onQuickStatusChange={handleQuickStatusChange}
              onVerifyPayment={handleVerifyPayment}
              getStatusColor={getStatusColor}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EditOrderDetailsDialog
        open={editDetailsDialogOpen}
        onOpenChange={setEditDetailsDialogOpen}
        order={selectedOrder}
        onSuccess={refetch}
      />

      <OrderStatusHistory
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        orderId={selectedOrder?.id}
        order={selectedOrder ? {
          payment_reference: selectedOrder.payment_reference,
        } : undefined}
      />

      {selectedOrder && (
        <PaymentConfirmationDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.order_number}
          customerEmail={selectedOrder.customers?.email || ''}
          deliveryAddressId={selectedOrder.delivery_address_id}
          onSuccess={refetch}
        />
      )}

      <ViewRelatedQuoteDialog
        open={viewQuoteDialogOpen}
        onOpenChange={setViewQuoteDialogOpen}
        quoteId={selectedOrder?.quote_id || null}
      />

      {selectedOrder && (
        <VerifyPaymentDialog
          open={verifyPaymentDialogOpen}
          onOpenChange={setVerifyPaymentDialogOpen}
          order={selectedOrder}
          onSuccess={refetch}
        />
      )}

      {selectedOrder && (
        <DeliveryManagementDialog
          open={deliveryDialogOpen}
          onOpenChange={setDeliveryDialogOpen}
          order={selectedOrder}
          onSuccess={refetch}
        />
      )}
    </div>
  );
};

export default UnifiedOrdersManagement;
