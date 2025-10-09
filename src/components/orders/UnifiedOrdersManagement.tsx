import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { OrdersDataTable } from './OrdersDataTable';
import { DeliveryManagementDialog } from './DeliveryManagementDialog';
import { EditOrderDetailsDialog } from './EditOrderDetailsDialog';
import OrderStatusHistory from './OrderStatusHistory';
import { PaymentConfirmationDialog } from './PaymentConfirmationDialog';
import { ViewRelatedQuoteDialog } from './ViewRelatedQuoteDialog';
import { ManualOrderCreationDialog } from './ManualOrderCreationDialog';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  delivery_address_id?: string;
  quote_id?: string;
  payment_reference?: string;
  notes?: string;
  customer_id: string;
  customers: {
    company_name: string;
    contact_name?: string;
    email?: string;
  };
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
  const { orders: realtimeOrders, loading, setOrders } = useRealtimeOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [editDetailsDialogOpen, setEditDetailsDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [viewQuoteDialogOpen, setViewQuoteDialogOpen] = useState(false);
  const [manualOrderDialogOpen, setManualOrderDialogOpen] = useState(false);

  // Fetch detailed order data with relations
  const [orders, setOrdersData] = useState<Order[]>([]);

  useEffect(() => {
    fetchDetailedOrders();
  }, [realtimeOrders]);

  const fetchDetailedOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          quotes(quote_number, title),
          customers(company_name, contact_name, email),
          customer_addresses(street_address, city, region, ghana_digital_address)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch order items separately
      const ordersWithItems = await Promise.all(
        (data || []).map(async (order) => {
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);
          
          return {
            ...order,
            order_items: items || []
          };
        })
      );

      setOrdersData(ordersWithItems as Order[]);
    } catch (error) {
      console.error('Error fetching detailed orders:', error);
    }
  };

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
      fetchDetailedOrders();
    } catch (error) {
      console.error('Error requesting delivery address:', error);
      toast.error('Failed to request delivery address');
    }
  };

  const handleConfirmPayment = (order: Order) => {
    setSelectedOrder(order);
    setPaymentDialogOpen(true);
  };

  const handleSendTracking = async (order: Order) => {
    try {
      const { error } = await supabase.functions.invoke('send-order-tracking-link', {
        body: {
          orderId: order.id,
          customerEmail: order.customers?.email,
          customerName: order.customers?.contact_name,
          companyName: order.customers?.company_name,
        },
      });

      if (error) throw error;
      toast.success('Tracking link sent to customer');
    } catch (error) {
      console.error('Error sending tracking link:', error);
      toast.error('Failed to send tracking link');
    }
  };

  const handleViewQuote = (order: Order) => {
    setSelectedOrder(order);
    setViewQuoteDialogOpen(true);
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
                         order.customers.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    
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

  const manualOrdersCount = orders.filter(o => !o.quote_id).length;
  const autoOrdersCount = orders.filter(o => !!o.quote_id).length;
  const pendingAddressCount = orders.filter(o => !o.delivery_address_id && ['payment_received', 'processing'].includes(o.status)).length;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
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
            Track and manage all orders - auto-generated and manual
          </p>
        </div>
        <Button onClick={() => setManualOrderDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Manual Order
        </Button>
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
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
          <TabsTrigger value="auto">Auto ({autoOrdersCount})</TabsTrigger>
          <TabsTrigger value="manual">Manual ({manualOrdersCount})</TabsTrigger>
          <TabsTrigger value="order_confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="payment_received">Payment</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500 mb-4">
                  Orders can be created manually or automatically from accepted quotes.
                </p>
                <Button onClick={() => setManualOrderDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Manual Order
                </Button>
              </CardContent>
            </Card>
          ) : (
            <OrdersDataTable
              orders={filteredOrders}
              onEditDetails={handleEditDetails}
              onViewHistory={handleViewHistory}
              onRequestAddress={handleRequestAddress}
              onConfirmPayment={handleConfirmPayment}
              onSendTracking={handleSendTracking}
              onViewQuote={handleViewQuote}
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
        onSuccess={fetchDetailedOrders}
      />

      {selectedOrder && (
        <OrderStatusHistory orderId={selectedOrder.id} />
      )}

      {selectedOrder && (
        <PaymentConfirmationDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.order_number}
          customerEmail={selectedOrder.customers?.email || ''}
          deliveryAddressId={selectedOrder.delivery_address_id}
          onSuccess={fetchDetailedOrders}
        />
      )}

      <ViewRelatedQuoteDialog
        open={viewQuoteDialogOpen}
        onOpenChange={setViewQuoteDialogOpen}
        quoteId={selectedOrder?.quote_id || null}
      />

      <ManualOrderCreationDialog
        open={manualOrderDialogOpen}
        onOpenChange={setManualOrderDialogOpen}
        onSuccess={fetchDetailedOrders}
      />
    </div>
  );
};

export default UnifiedOrdersManagement;
