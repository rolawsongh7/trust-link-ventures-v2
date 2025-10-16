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
import { useOrdersQuery } from '@/hooks/useOrdersQuery';
import { OrdersDataTable } from './OrdersDataTable';
import { DeliveryManagementDialog } from './DeliveryManagementDialog';
import { EditOrderDetailsDialog } from './EditOrderDetailsDialog';
import OrderStatusHistory from './OrderStatusHistory';
import { PaymentConfirmationDialog } from './PaymentConfirmationDialog';
import { ViewRelatedQuoteDialog } from './ViewRelatedQuoteDialog';
import { ManualOrderCreationDialog } from './ManualOrderCreationDialog';
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
  // Use React Query for data fetching with caching
  const { orders: queryOrders, isLoading: queryLoading, refetch } = useOrdersQuery();
  
  // Keep real-time updates for live notifications
  const { orders: realtimeOrders, loading: realtimeLoading } = useRealtimeOrders();
  
  // Merge cached data with real-time updates (use queryOrders as the primary source)
  const orders = queryOrders.length > 0 ? queryOrders : realtimeOrders;
  const loading = queryLoading || realtimeLoading;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [editDetailsDialogOpen, setEditDetailsDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [viewQuoteDialogOpen, setViewQuoteDialogOpen] = useState(false);
  const [manualOrderDialogOpen, setManualOrderDialogOpen] = useState(false);
  const [verifyPaymentDialogOpen, setVerifyPaymentDialogOpen] = useState(false);

  // Refetch when real-time updates come in
  useEffect(() => {
    if (realtimeOrders.length > 0) {
      refetch();
    }
  }, [realtimeOrders.length, refetch]);

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

  const handleGenerateInvoices = async (order: Order) => {
    // CRITICAL: Log function entry immediately
    console.log('=== INVOICE GENERATION STARTED ===', {
      orderId: order?.id,
      orderNumber: order?.order_number,
      orderStatus: order?.status,
      timestamp: new Date().toISOString(),
      hasOrderItems: !!order?.order_items?.length
    });

    // Validate order object exists
    if (!order) {
      console.error('[CRITICAL] No order object passed to handleGenerateInvoices');
      toast.error('Invalid order data - cannot generate invoices');
      return;
    }

    // Validate order has required fields
    if (!order.id || !order.order_number) {
      console.error('[CRITICAL] Order missing required fields:', {
        hasId: !!order.id,
        hasOrderNumber: !!order.order_number,
        order
      });
      toast.error('Order data incomplete - cannot generate invoices');
      return;
    }

    const toastId = toast.loading('Generating invoices...');
    let operationComplete = false;
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (!operationComplete) {
        console.error('[TIMEOUT] Invoice generation exceeded 60 seconds');
        toast.error('Invoice generation timed out. Please try again.', { id: toastId });
      }
    }, 60000); // 60 second timeout
    
    try {
      // First generate packing list
      console.log('[UI] Starting packing list generation:', {
        orderId: order.id,
        orderNumber: order.order_number,
        timestamp: new Date().toISOString()
      });
      
      toast.loading('Generating packing list...', { id: toastId });
      
      const { data: packingData, error: packingError } = await supabase.functions.invoke('generate-packing-list', {
        body: { orderId: order.id },
      });

      console.log('[UI] Packing list response:', { 
        packingData, 
        packingError,
        timestamp: new Date().toISOString()
      });

      if (packingError) {
        operationComplete = true;
        clearTimeout(timeoutId);
        console.error('[UI] Packing list error details:', {
          error: packingError,
          message: packingError.message,
          context: packingError.context,
          orderId: order.id
        });
        
        const errorMsg = packingError.message || 'Unknown error occurred';
        toast.error(`Packing list failed: ${errorMsg}. Check console for details.`, { id: toastId });
        return;
      }

      if (!packingData?.success) {
        operationComplete = true;
        clearTimeout(timeoutId);
        console.error('[UI] Packing list generation failed:', {
          packingData,
          orderId: order.id,
          reason: 'No success flag in response'
        });
        
        const errorMsg = packingData?.error || 'Generation failed - no success flag';
        toast.error(`Packing list error: ${errorMsg}`, { id: toastId });
        return;
      }

      console.log('[UI] Packing list created successfully:', {
        invoiceNumber: packingData.invoiceNumber,
        fileUrl: packingData.fileUrl
      });
      
      toast.loading('✓ Packing list created. Generating commercial invoice...', { id: toastId });

      // Then generate commercial invoice
      console.log('[UI] Starting commercial invoice generation:', {
        orderId: order.id,
        orderNumber: order.order_number,
        timestamp: new Date().toISOString()
      });
      
      const { data: commercialData, error: commercialError } = await supabase.functions.invoke('generate-commercial-invoice', {
        body: { orderId: order.id },
      });

      console.log('[UI] Commercial invoice response:', { 
        commercialData, 
        commercialError,
        timestamp: new Date().toISOString()
      });

      if (commercialError) {
        operationComplete = true;
        clearTimeout(timeoutId);
        console.error('[UI] Commercial invoice error details:', {
          error: commercialError,
          message: commercialError.message,
          context: commercialError.context,
          orderId: order.id
        });
        
        const errorMsg = commercialError.message || 'Unknown error occurred';
        toast.error(`Commercial invoice failed: ${errorMsg}. Check console for details.`, { id: toastId });
        return;
      }

      if (!commercialData?.success) {
        operationComplete = true;
        clearTimeout(timeoutId);
        console.error('[UI] Commercial invoice generation failed:', {
          commercialData,
          orderId: order.id,
          reason: 'No success flag in response'
        });
        
        const errorMsg = commercialData?.error || 'Generation failed - no success flag';
        toast.error(`Commercial invoice error: ${errorMsg}`, { id: toastId });
        return;
      }

      operationComplete = true;
      clearTimeout(timeoutId);
      console.log('[UI] All invoices generated successfully:', {
        packingList: packingData.invoiceNumber,
        commercialInvoice: commercialData.invoiceNumber,
        timestamp: new Date().toISOString()
      });
      
      toast.success('✓ All invoices generated successfully!', { id: toastId });
      
      // Refresh orders data after a short delay
      setTimeout(() => {
        console.log('[UI] Refreshing orders data');
        refetch();
      }, 1500);
      
    } catch (error: any) {
      operationComplete = true;
      clearTimeout(timeoutId);
      console.error('[UI] Exception generating invoices:', {
        error,
        message: error?.message,
        stack: error?.stack,
        orderId: order.id,
        orderNumber: order.order_number,
        timestamp: new Date().toISOString()
      });
      
      const errorMessage = error?.message || 'Unknown error occurred';
      toast.error(`Invoice generation failed: ${errorMessage}. Check console for details.`, { id: toastId });
    }
  };

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
              orders={filteredOrders as any}
              onEditDetails={handleEditDetails}
              onViewHistory={handleViewHistory}
              onRequestAddress={handleRequestAddress}
              onConfirmPayment={handleConfirmPayment}
              onSendTracking={handleSendTracking}
              onViewQuote={handleViewQuote}
              onRefresh={refetch}
              onGenerateInvoices={handleGenerateInvoices}
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
          onSuccess={refetch}
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
        onSuccess={refetch}
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
