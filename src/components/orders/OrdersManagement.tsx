import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle, Mail, MapPin, Send, Link2, Edit, History, Lock, DollarSign, FileText, Download, Calendar, Filter, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DeliveryManagementDialog } from './DeliveryManagementDialog';
import { EditOrderDetailsDialog } from './EditOrderDetailsDialog';
import OrderStatusHistory from './OrderStatusHistory';
import { PaymentConfirmationDialog } from './PaymentConfirmationDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QuoteOriginInfo } from '@/components/quotes/QuoteOriginInfo';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string;
  status: string;
  order_date?: string;
  expected_delivery_date?: string;
  notes?: string;
  created_at: string;
  delivery_address_id?: string;
  payment_reference?: string;
  delivery_address_requested_at?: string;
  delivery_address_confirmed_at?: string;
  source_quote_id?: string;
  manual_confirmation_method?: string;
  manual_confirmation_notes?: string;
  customer_addresses?: {
    street_address: string;
    city: string;
    region: string;
    ghana_digital_address?: string;
  };
  quote_id?: string;
  quotes: {
    quote_number: string;
    title: string;
  };
  customers: {
    company_name: string;
    contact_name?: string;
    email?: string;
  };
  order_items: any[];
  invoices?: Array<{
    id: string;
    invoice_number: string;
    invoice_type: string;
    file_url: string | null;
    status: string;
  }>;
}

const OrdersManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [editDetailsDialogOpen, setEditDetailsDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [paymentConfirmOrder, setPaymentConfirmOrder] = useState<Order | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {}
  });

  const getValidNextStatuses = (currentStatus: string): string[] => {
    const statusFlow: Record<string, string[]> = {
      'order_confirmed': ['pending_payment', 'cancelled'],
      'pending_payment': ['payment_received', 'cancelled'],
      'payment_received': ['processing', 'cancelled'],
      'processing': ['ready_to_ship', 'cancelled'],
      'ready_to_ship': ['shipped', 'cancelled'],
      'shipped': ['delivered', 'delivery_failed'],
      'delivered': [],
      'cancelled': [],
      'delivery_failed': ['shipped']
    };
    
    return statusFlow[currentStatus] || [];
  };

  useEffect(() => {
    fetchOrders();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('orders-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          quotes!quote_id(quote_number, title),
          customers(company_name, contact_name, email),
          customer_addresses(street_address, city, region, ghana_digital_address)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch order items and invoices separately to avoid join issues
      const ordersWithItems = await Promise.all(
        (data || []).map(async (order) => {
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);
          
          const { data: invoices } = await supabase
            .from('invoices')
            .select('id, invoice_number, invoice_type, file_url, status')
            .eq('order_id', order.id)
            .in('invoice_type', ['commercial', 'packing_list'])
            .not('file_url', 'is', null);
          
          return {
            ...order,
            order_items: items || [],
            invoices: invoices || []
          };
        })
      );

      setOrders(ordersWithItems as Order[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentConfirmation = (order: Order) => {
    setPaymentConfirmOrder(order);
    setPaymentDialogOpen(true);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // Show confirmation for critical status changes
    if (newStatus === 'ready_to_ship' || newStatus === 'shipped') {
      setConfirmDialog({
        open: true,
        title: `Confirm ${newStatus.replace(/_/g, ' ').toUpperCase()}`,
        description: newStatus === 'ready_to_ship' 
          ? 'This will:\n• Generate a Packing List\n• Validate delivery address exists\n\nAre you sure you want to proceed?'
          : 'This will:\n• Generate a Commercial Invoice\n• Send tracking email to customer\n• Create tracking token for customer\n\nAre you sure you want to proceed?',
        onConfirm: async () => {
          await performStatusUpdate(orderId, newStatus);
          setConfirmDialog({ ...confirmDialog, open: false });
        }
      });
      return;
    }

    await performStatusUpdate(orderId, newStatus);
  };

  const performStatusUpdate = async (orderId: string, status: string) => {
    try {
      // Get order details first
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          *,
          quotes!quote_id(
            customers(email, contact_name, company_name)
          )
        `)
        .eq('id', orderId)
        .single();

      // Update status
      const { error } = await supabase
        .from('orders')
        .update({ status } as any)
        .eq('id', orderId);

      if (error) {
        // Check if it's the delivery address validation error
        if (error.message?.includes('delivery address')) {
          toast.error("Cannot ship without delivery address. Please request address from customer first.");
          return;
        }
        
        // Check if it's a status transition validation error
        if (error.message?.includes('Invalid order status transition')) {
          toast.error(error.message);
          return;
        }
        
        throw error;
      }

      // Send tracking email for specific statuses
      const emailStatuses = ['shipped', 'delivered', 'ready_to_ship', 'processing'];
      if (emailStatuses.includes(status) && orderData?.quotes?.customers?.email) {
        try {
          await supabase.functions.invoke('send-order-tracking-link', {
            body: {
              orderId,
              customerEmail: orderData.quotes.customers.email,
              customerName: orderData.quotes.customers.contact_name,
              companyName: orderData.quotes.customers.company_name,
            },
          });
        } catch (emailError) {
          console.error('Error sending tracking email:', emailError);
          // Don't fail the status update if email fails
        }
      }

      toast.success(`Order status updated to ${status.replace(/_/g, ' ')}`);

      fetchOrders();
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error(error.message || "Failed to update order status");
    }
  };

  const handleSendTrackingLink = async (order: Order) => {
    try {
      const { error } = await supabase.functions.invoke('send-tracking-link', {
        body: { orderId: order.id },
      });

      if (error) throw error;

      toast.success('Tracking link sent to customer');
    } catch (error) {
      console.error('Error sending tracking link:', error);
      toast.error('Failed to send tracking link');
    }
  };

  const sendOrderTrackingLink = async (order: Order) => {
    try {
      // Check if customer email is available from the related quote
      let customerEmail = null;
      
      // For now, we'll prompt for email since customer ID is not available in the current interface
      // In a full implementation, you would fetch the customer data properly

      // Prompt for email
      customerEmail = prompt('Please enter the customer email address:');
      if (!customerEmail) return;

      toast.loading("Sending tracking link...");

      const { data, error } = await supabase.functions.invoke('send-order-tracking-link', {
        body: {
          orderId: order.id,
          customerEmail: customerEmail,
          customerName: order.customers?.contact_name,
          companyName: order.customers?.company_name
        }
      });

      if (error) throw error;

      toast.success("Order tracking link sent successfully to " + customerEmail);
    } catch (error: any) {
      console.error('Error sending order tracking link:', error);
      toast.error("Failed to send order tracking link");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'quote_pending': return 'bg-gray-100 text-gray-800';
      case 'quote_sent': return 'bg-blue-100 text-blue-800';
      case 'order_confirmed': return 'bg-cyan-100 text-cyan-800';
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

  const getEnhancedStatusStyle = (status: string) => {
    switch (status) {
      case 'quote_pending':
        return 'bg-gradient-to-r from-[#9CA3AF] to-[#6B7280] text-white shadow-md';
      case 'quote_sent':
        return 'bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white shadow-md';
      case 'order_confirmed':
        return 'bg-gradient-to-r from-[#06B6D4] to-[#0891B2] text-white shadow-md';
      case 'pending_payment':
        return 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white shadow-md';
      case 'payment_received':
        return 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-md';
      case 'processing':
        return 'bg-gradient-to-r from-[#A855F7] to-[#9333EA] text-white shadow-md';
      case 'ready_to_ship':
        return 'bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white shadow-md';
      case 'shipped':
        return 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white shadow-md';
      case 'delivered':
        return 'bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white shadow-md';
      case 'cancelled':
        return 'bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white shadow-md';
      case 'delivery_failed':
        return 'bg-gradient-to-r from-[#F87171] to-[#EF4444] text-white shadow-md';
      default:
        return 'bg-gradient-to-r from-[#64748B] to-[#475569] text-white shadow-md';
    }
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

      // Update order to track request
      await supabase
        .from('orders')
        .update({ delivery_address_requested_at: new Date().toISOString() })
        .eq('id', order.id);

      toast.success('Delivery address request sent to customer');
      fetchOrders();
    } catch (error) {
      console.error('Error requesting delivery address:', error);
      toast.error('Failed to request delivery address');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'quote_pending': return <Clock className="h-4 w-4" />;
      case 'quote_sent': return <Package className="h-4 w-4" />;
      case 'order_confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'payment_received': return <CheckCircle className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'ready_to_ship': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      case 'delivery_failed': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customers.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.quotes.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesTab = false;
    if (selectedTab === 'all') {
      matchesTab = true;
    } else if (selectedTab === 'pending_address') {
      matchesTab = !order.delivery_address_id && ['payment_received', 'processing'].includes(order.status);
    } else {
      matchesTab = order.status === selectedTab;
    }
    
    return matchesSearch && matchesTab;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 bg-gradient-to-br from-[#E2E8F0] to-[#CBD5E1] rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-[#E2E8F0] rounded-lg w-1/3"></div>
                  <div className="h-4 bg-[#F1F5F9] rounded-lg w-1/2"></div>
                </div>
                <div className="h-16 w-32 bg-gradient-to-br from-[#E0F2FE] to-[#BAE6FD] rounded-xl"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-[#F1F5F9] rounded w-full"></div>
                <div className="h-3 bg-[#F1F5F9] rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen bg-[#F8FAFC] p-6">
      {/* Premium Gradient Header with Trust Link Branding */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#1E40AF] via-[#3B82F6] to-[#0EA5E9] p-8 mb-6 shadow-xl">
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Orders
            </h1>
            <p className="text-blue-100 text-lg">
              Manage processing, shipped, and completed orders
            </p>
          </div>
          
          {/* Order Count Badge */}
          <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full border border-white/30 flex items-center gap-3">
            <Package className="h-6 w-6 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">{orders.length}</p>
              <p className="text-xs text-blue-100">Total Orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Frosted Glass Filter Container */}
      <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-lg space-y-4">
        {/* Search Bar Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#64748B] h-5 w-5" />
            <Input
              placeholder="Search by order number, company, or quote..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-base rounded-xl border-[#E2E8F0] focus:border-[#3B82F6] transition-all"
            />
          </div>
          
          {/* Quick Stats Pills */}
          <div className="hidden lg:flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 text-sm">
              <Clock className="h-4 w-4 mr-1" />
              {orders.filter(o => ['order_confirmed', 'pending_payment'].includes(o.status)).length} Pending
            </Badge>
            <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 text-sm">
              <Package className="h-4 w-4 mr-1" />
              {orders.filter(o => ['processing', 'ready_to_ship'].includes(o.status)).length} Processing
            </Badge>
            <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 text-sm">
              <Truck className="h-4 w-4 mr-1" />
              {orders.filter(o => o.status === 'shipped').length} Shipped
            </Badge>
          </div>
        </div>

        {/* Enhanced Tabs with Gradient Active States */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 bg-[#F1F5F9] p-1 rounded-xl h-auto gap-1">
            <TabsTrigger 
              value="all"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B82F6] data-[state=active]:to-[#0EA5E9] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3 text-sm"
            >
              <span className="flex items-center gap-2">
                All
                <Badge className="bg-white/20 text-current border-none text-xs">{orders.length}</Badge>
              </span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="pending_address"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#EF4444] data-[state=active]:to-[#DC2626] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                No Address
                <Badge className="bg-white/20 text-current border-none text-xs">
                  {orders.filter(o => !o.delivery_address_id && ['payment_received', 'processing'].includes(o.status)).length}
                </Badge>
              </span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="order_confirmed"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#06B6D4] data-[state=active]:to-[#0891B2] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3 text-sm"
            >
              <span className="flex items-center gap-2">
                Confirmed
                <Badge className="bg-white/20 text-current border-none text-xs">
                  {orders.filter(o => o.status === 'order_confirmed').length}
                </Badge>
              </span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="payment_received"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#10B981] data-[state=active]:to-[#059669] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Paid
                <Badge className="bg-white/20 text-current border-none text-xs">
                  {orders.filter(o => o.status === 'payment_received').length}
                </Badge>
              </span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="processing"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#A855F7] data-[state=active]:to-[#9333EA] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Processing
                <Badge className="bg-white/20 text-current border-none text-xs">
                  {orders.filter(o => o.status === 'processing').length}
                </Badge>
              </span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="ready_to_ship"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366F1] data-[state=active]:to-[#4F46E5] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3 text-sm"
            >
              <span className="flex items-center gap-2">
                Ready
                <Badge className="bg-white/20 text-current border-none text-xs">
                  {orders.filter(o => o.status === 'ready_to_ship').length}
                </Badge>
              </span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="shipped"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F59E0B] data-[state=active]:to-[#D97706] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Shipped
                <Badge className="bg-white/20 text-current border-none text-xs">
                  {orders.filter(o => o.status === 'shipped').length}
                </Badge>
              </span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="delivered"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#22C55E] data-[state=active]:to-[#16A34A] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Delivered
                <Badge className="bg-white/20 text-current border-none text-xs">
                  {orders.filter(o => o.status === 'delivered').length}
                </Badge>
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-4 mt-6">
            {filteredOrders.length === 0 ? (
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-12 text-center shadow-lg border border-white/20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#3B82F6]/20 to-[#0EA5E9]/20 flex items-center justify-center">
                  <Package className="h-8 w-8 text-[#3B82F6]" />
                </div>
                <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No orders found</h3>
                <p className="text-[#64748B]">
                  Orders are automatically created when quotes are accepted by customers.
                </p>
              </div>
            ) : (
              filteredOrders.map(order => (
                <Card key={order.id} className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                  <CardHeader className="pb-3 bg-gradient-to-r from-[#F8FAFC] to-white border-b border-[#E2E8F0]">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        {/* Order Number with Icon */}
                        <CardTitle className="text-xl flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#0EA5E9] flex items-center justify-center flex-shrink-0 shadow-md text-white">
                            {getStatusIcon(order.status)}
                          </div>
                          <div>
                            <span className="font-mono text-[#3B82F6] font-bold">{order.order_number}</span>
                            <p className="text-sm font-normal text-[#64748B] mt-0.5">
                              {order.customers.company_name}
                            </p>
                          </div>
                        </CardTitle>
                        
                        {/* Badges Row */}
                        <div className="flex items-center flex-wrap gap-2">
                          {/* Enhanced Status Badge */}
                          <Badge className={cn(
                            "px-3 py-1.5 rounded-full font-medium text-xs flex items-center gap-1.5 shadow-sm",
                            getEnhancedStatusStyle(order.status)
                          )}>
                            {getStatusIcon(order.status)}
                            <span className="capitalize">{order.status.replace(/_/g, ' ')}</span>
                          </Badge>
                          
                          {/* Delivery Address Warning Badge */}
                          {!order.delivery_address_id && ['payment_received', 'processing', 'ready_to_ship'].includes(order.status) && (
                            <Badge className="bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white px-3 py-1.5 rounded-full font-medium text-xs flex items-center gap-1.5 shadow-sm animate-pulse">
                              <AlertCircle className="h-3 w-3" />
                              No Delivery Address
                            </Badge>
                          )}
                          
                          {/* Address Confirmed Badge */}
                          {order.delivery_address_id && (
                            <Badge className="bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white px-3 py-1.5 rounded-full font-medium text-xs flex items-center gap-1.5 shadow-sm">
                              <CheckCircle className="h-3 w-3" />
                              Address Confirmed
                            </Badge>
                          )}
                          
                          {/* Quote Link Badge */}
                          {order.quotes && (
                            <Badge className="bg-gradient-to-r from-[#3B82F6]/10 to-[#0EA5E9]/10 text-[#3B82F6] border border-[#3B82F6]/30 px-3 py-1.5 rounded-full font-medium text-xs flex items-center gap-1.5">
                              <Link2 className="w-3 h-3" />
                              {order.quotes.quote_number}
                            </Badge>
                          )}
                          
                          {/* Origin Badge */}
                          {order.quote_id ? (
                            <Badge className="bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9] text-white px-3 py-1.5 rounded-full font-medium text-xs flex items-center gap-1.5 shadow-sm">
                              🤖 Auto-generated
                            </Badge>
                          ) : (
                            <Badge className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white px-3 py-1.5 rounded-full font-medium text-xs flex items-center gap-1.5 shadow-sm">
                              ✏️ Manual Order
                            </Badge>
                          )}
                          
                          {/* Items Count Badge */}
                          <Badge className="bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] px-3 py-1.5 rounded-full font-medium text-xs flex items-center gap-1.5">
                            <Package className="h-3 w-3" />
                            {order.order_items.length} Item(s)
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Total Amount Section */}
                      <div className="text-right space-y-2">
                        <div className="bg-gradient-to-br from-[#F0F9FF] to-[#E0F2FE] px-4 py-3 rounded-xl border border-[#BAE6FD]">
                          <p className="text-xs text-[#0369A1] font-medium mb-1">Total Amount</p>
                          <div className="text-2xl font-bold text-[#0C4A6E] flex items-center gap-2">
                            {order.currency}
                            <span>{order.total_amount.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 text-xs text-[#64748B]">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-4 space-y-4">
                    {/* Delivery Address Section */}
                    {order.customer_addresses && (
                      <div className="bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] p-4 rounded-xl border border-[#86EFAC]">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-4 w-4 text-white" />
                          </div>
                          <div className="text-sm flex-1">
                            <p className="font-semibold text-[#14532D] mb-1">Delivery Address</p>
                            <p className="text-[#166534] leading-relaxed">
                              {order.customer_addresses.street_address}, {order.customer_addresses.city}, {order.customer_addresses.region}
                              {order.customer_addresses.ghana_digital_address && (
                                <span className="ml-2 font-mono text-xs bg-white px-2 py-1 rounded border border-[#86EFAC]">
                                  {order.customer_addresses.ghana_digital_address}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Order Items Section */}
                    <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
                      <h4 className="font-semibold text-[#0F172A] mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4 text-[#3B82F6]" />
                        Order Items
                      </h4>
                      <div className="space-y-2">
                        {order.order_items.map((item, index) => (
                          <div 
                            key={item.id} 
                            className={cn(
                              "flex justify-between items-center text-sm p-2 rounded-lg",
                              index % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'
                            )}
                          >
                            <span className="font-medium text-[#0F172A]">{item.product_name}</span>
                            <span className="text-[#64748B]">
                              {item.quantity} {item.unit} × {order.currency} {item.unit_price} = 
                              <span className="font-semibold text-[#0F172A] ml-1">
                                {order.currency} {item.total_price.toLocaleString()}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Documents Section */}
                    {order.invoices && order.invoices.length > 0 && (
                      <div className="bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] rounded-xl p-4 border border-[#FCD34D]">
                        <h4 className="font-semibold text-[#78350F] mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Documents
                        </h4>
                        <div className="space-y-2">
                          {order.invoices
                            .filter(inv => inv.file_url)
                            .map(invoice => (
                              <div key={invoice.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-[#FCD34D]/30">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
                                    <FileText className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-[#78350F]">
                                      {invoice.invoice_type === 'commercial' ? 'Commercial Invoice' : 
                                       invoice.invoice_type === 'packing_list' ? 'Packing List' : 
                                       invoice.invoice_type}
                                    </p>
                                    <p className="text-xs text-[#92400E] font-mono">{invoice.invoice_number}</p>
                                  </div>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => invoice.file_url && window.open(invoice.file_url, '_blank')}
                                  className="bg-white hover:bg-[#FFFBEB] border-[#F59E0B]/30 text-[#D97706] rounded-lg"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Actions Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
                      <div className="space-y-1">
                        {order.expected_delivery_date && (
                          <div className="flex items-center gap-2 text-sm text-[#64748B]">
                            <Truck className="h-4 w-4" />
                            <span>Expected: {new Date(order.expected_delivery_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-wrap justify-end">
                        {!order.delivery_address_id && order.status !== 'cancelled' && order.status !== 'delivered' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRequestAddress(order)}
                            className="rounded-xl border-[#EF4444] text-[#EF4444] hover:bg-[#FEE2E2] transition-all"
                          >
                            <MapPin className="w-4 h-4 mr-1" />
                            Request Address
                          </Button>
                        )}
                        
                        {['processing', 'ready_to_ship', 'shipped'].includes(order.status) && order.status !== 'delivered' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setDeliveryDialogOpen(true);
                            }}
                            className="rounded-xl border-[#F59E0B] text-[#F59E0B] hover:bg-[#FEF3C7] transition-all"
                          >
                            <Truck className="w-4 h-4 mr-1" />
                            Manage Delivery
                          </Button>
                        )}
                        
                        {order.status !== 'cancelled' && order.status !== 'delivered' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setEditDetailsDialogOpen(true);
                            }}
                            className="rounded-xl border-[#3B82F6] text-[#3B82F6] hover:bg-[#EFF6FF] transition-all"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit Details
                          </Button>
                        )}
                        
                        {['pending_payment', 'order_confirmed'].includes(order.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePaymentConfirmation(order)}
                            className="rounded-xl border-[#22C55E] text-[#22C55E] hover:bg-[#F0FDF4] transition-all"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Confirm Payment
                          </Button>
                        )}
                        
                        {order.status === 'shipped' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendTrackingLink(order)}
                            className="rounded-xl border-[#6366F1] text-[#6366F1] hover:bg-[#EEF2FF] transition-all"
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Send Tracking
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setHistoryDialogOpen(true);
                          }}
                          className="rounded-xl hover:bg-[#F1F5F9] text-[#64748B] transition-all"
                        >
                          <History className="w-4 h-4 mr-1" />
                          History
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedOrder && (
        <>
          <DeliveryManagementDialog
            order={selectedOrder}
            open={deliveryDialogOpen}
            onOpenChange={setDeliveryDialogOpen}
            onSuccess={fetchOrders}
          />
          
          <EditOrderDetailsDialog
            order={selectedOrder}
            open={editDetailsDialogOpen}
            onOpenChange={setEditDetailsDialogOpen}
            onSuccess={fetchOrders}
          />
          
          <OrderStatusHistory
            open={historyDialogOpen}
            onOpenChange={setHistoryDialogOpen}
            orderId={selectedOrder.id}
            order={{
              payment_reference: selectedOrder.payment_reference,
            }}
          />
        </>
      )}

      {paymentConfirmOrder && (
        <PaymentConfirmationDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          orderId={paymentConfirmOrder.id}
          orderNumber={paymentConfirmOrder.order_number}
          customerEmail={paymentConfirmOrder.customers?.email || ''}
          deliveryAddressId={paymentConfirmOrder.delivery_address_id}
          onSuccess={fetchOrders}
        />
      )}

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.onConfirm}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrdersManagement;