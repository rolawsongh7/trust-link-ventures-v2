import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Search, Truck, Eye, RotateCcw, Calendar, DollarSign, Download, MapPin, AlertCircle, Upload, CreditCard, Clock, CheckCircle } from 'lucide-react';
import { PortalPageHeader } from './PortalPageHeader';
import { formatDistanceToNow } from 'date-fns';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AddressSelectionDialog from './AddressSelectionDialog';
import { CustomerPaymentProofDialog } from './CustomerPaymentProofDialog';
import { OrderPaymentInstructions } from './OrderPaymentInstructions';
import { ensureCustomerRecord } from '@/lib/customerUtils';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { MobileOrderCard } from './mobile/MobileOrderCard';
import { MobileOrderDetailDialog } from './mobile/MobileOrderDetailDialog';
import { InvoicePreviewDialog } from './InvoicePreviewDialog';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderStatusBadge } from './OrderStatusBadge';
import { getOrderStatusConfig, orderStatusFilterOptions } from '@/utils/orderStatusConfig';
import { OrderIssueReportDialog } from './OrderIssueReportDialog';
import { OrdersEmptyState } from './empty-states';


// Order interface matching database schema
interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  estimated_delivery_date?: string;
  tracking_number?: string;
  delivery_address_id?: string;
  delivery_address_requested_at?: string;
  payment_proof_url?: string;
  payment_verified_at?: string;
  payment_rejected_at?: string;
  payment_status_reason?: string;
  payment_amount_confirmed?: number;
  order_items?: any[];
  quotes?: {
    quote_number: string;
    customers?: {
      company_name: string;
      contact_name: string;
    };
  };
  // Added for issue tracking
  has_active_issue?: boolean;
}

// Helper to check if order has partial payment
const hasPartialPayment = (order: Order): boolean => {
  if (!order.payment_verified_at) return false;
  const confirmedAmount = order.payment_amount_confirmed || 0;
  return confirmedAmount > 0 && confirmedAmount < order.total_amount;
};

// Get remaining balance
const getBalanceRemaining = (order: Order): number => {
  const confirmedAmount = order.payment_amount_confirmed || 0;
  return order.total_amount - confirmedAmount;
};

export const CustomerOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [selectedOrderForAddress, setSelectedOrderForAddress] = useState<Order | null>(null);
  const [paymentProofDialogOpen, setPaymentProofDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [showPaymentInstructions, setShowPaymentInstructions] = useState<string | null>(null);
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
  const [reportIssueDialogOpen, setReportIssueDialogOpen] = useState(false);
  const [selectedOrderForIssue, setSelectedOrderForIssue] = useState<Order | null>(null);
  const { profile } = useCustomerAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isMobile } = useMobileDetection();

  useEffect(() => {
    if (profile?.email) {
      fetchOrders();

      // Set up real-time subscription for order updates
      const subscription = supabase
        .channel('customer-orders-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            console.log('Order change detected:', payload);
            fetchOrders(); // Refresh orders when any change occurs
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [profile]);

  // Check for addressNeeded query parameter to auto-open address dialog
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderIdNeedingAddress = params.get('addressNeeded');
    
    if (!orderIdNeedingAddress) return;
    if (loading) return; // Wait for orders to load
    
    const order = orders.find(o => o.id === orderIdNeedingAddress);
    
    if (!order) {
      toast({
        title: "Order Not Found",
        description: "This order may have been updated or removed.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/portal/orders');
      return;
    }
    
    if (order.delivery_address_id) {
      toast({
        title: "Address Already Set",
        description: "A delivery address has already been added to this order.",
      });
      window.history.replaceState({}, '', '/portal/orders');
      return;
    }
    
    setSelectedOrderForAddress(order);
    setAddressDialogOpen(true);
    window.history.replaceState({}, '', '/portal/orders');
  }, [orders, loading, toast]);

  // Check for uploadPayment query parameter to auto-open payment dialog
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderIdNeedingPayment = params.get('uploadPayment');
    
    if (!orderIdNeedingPayment) return;
    if (loading) return; // Wait for orders to load
    
    const order = orders.find(o => o.id === orderIdNeedingPayment);
    
    if (!order) {
      toast({
        title: "Order Not Found",
        description: "This order may have been updated or removed.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/portal/orders');
      return;
    }
    
    // Check if payment already uploaded
    if (order.payment_proof_url) {
      toast({
        title: "Payment Already Submitted",
        description: "Payment proof has already been uploaded for this order.",
      });
      window.history.replaceState({}, '', '/portal/orders');
      return;
    }
    
    // Check if order status is valid for payment
    if (!['order_confirmed', 'pending_payment'].includes(order.status)) {
      toast({
        title: "Payment Not Required",
        description: "This order no longer requires payment upload.",
      });
      window.history.replaceState({}, '', '/portal/orders');
      return;
    }
    
    setSelectedOrderForPayment(order);
    setPaymentProofDialogOpen(true);
    window.history.replaceState({}, '', '/portal/orders');
  }, [orders, loading, toast]);

  const fetchOrders = async () => {
    if (!profile?.email) {
      console.error('No profile email found');
      toast({
        title: "Authentication Error",
        description: "Unable to retrieve your profile. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Debug: Log the email being searched
      console.log('🔍 DEBUG - Auth email:', profile.email);
      console.log('🔍 DEBUG - Profile ID:', profile?.id);

      // Use the case-insensitive customer lookup utility
      const customer = await ensureCustomerRecord(profile.email);

      if (!customer) {
        console.error('❌ No customer record found');
        console.log('🔍 DEBUG - Tried email:', profile.email);
        toast({
          title: "No Customer Profile",
          description: `Your account (${profile.email}) is not linked to a customer profile. Please contact support at support@trustlinkcompany.com`,
          variant: "destructive",
        });
        setOrders([]);
        setLoading(false);
        return;
      }

      console.log('✅ Customer found:', {
        id: customer.id,
        email: customer.email,
        company: customer.company_name
      });

      // Fetch orders with better error handling
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*),
          quotes!quote_id(
            quote_number,
            customers(company_name, contact_name)
          )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('❌ Error fetching orders:', ordersError);
        throw ordersError;
      }

      // Fetch active issues for these orders to show issue badges
      const orderIds = ordersData?.map(o => o.id) || [];
      let activeIssuesMap: Record<string, boolean> = {};
      
      if (orderIds.length > 0) {
        const { data: issuesData } = await supabase
          .from('order_issues')
          .select('order_id')
          .in('order_id', orderIds)
          .in('status', ['submitted', 'reviewing']);
        
        if (issuesData) {
          issuesData.forEach(issue => {
            activeIssuesMap[issue.order_id] = true;
          });
        }
      }

      // Merge issue status into orders
      const ordersWithIssues = (ordersData || []).map(order => ({
        ...order,
        has_active_issue: activeIssuesMap[order.id] || false
      }));

      console.log('✅ Orders data:', ordersWithIssues);
      console.log('🔍 DEBUG - Number of orders found:', ordersWithIssues.length);
      setOrders(ordersWithIssues);
      
    } catch (error) {
      console.error('💥 Error in fetchOrders:', error);
      toast({
        title: "Error Loading Orders",
        description: error instanceof Error ? error.message : "Failed to load orders. Please try again.",
        variant: "destructive",
      });
      setOrders([]); // Ensure orders is always an array
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.order_items || []).some(item => 
                           item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Get status border color using centralized config
  const getStatusBorderColor = (status: string) => {
    const config = getOrderStatusConfig(status);
    return config.borderClass;
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'GHS': '₵'
    };
    return symbols[currency] || '';
  };

  const getCurrencyBadgeColor = (currency: string) => {
    const colors: Record<string, string> = {
      'USD': 'bg-tl-accent/10 text-tl-accent border-tl-accent/30',
      'EUR': 'bg-tl-success/10 text-tl-success border-tl-success/30',
      'GBP': 'bg-tl-primary/10 text-tl-primary border-tl-primary/30',
      'GHS': 'bg-tl-warning/10 text-tl-warning border-tl-warning/30'
    };
    return colors[currency] || 'bg-tl-muted/20 text-tl-muted border-tl-border';
  };

  const getStatusIcon = (status: string) => {
    return getOrderStatusConfig(status).icon;
  };

  const handleReorder = async (order: Order) => {
    if (!order.order_items || order.order_items.length === 0) {
      toast({
        title: "No Items",
        description: "This order has no items to reorder.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔵 [Reorder] Starting reorder for:', order.order_number);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to add items to your cart.",
          variant: "destructive",
        });
        return;
      }

      // Prepare cart items for bulk insert
      const cartItems = order.order_items.map(item => ({
        user_id: user.id,
        product_name: item.product_name,
        product_description: item.product_description || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'kg',
        specifications: item.specifications || '',
      }));

      console.log('🔵 [Reorder] Inserting items:', cartItems.length);

      // Bulk insert all items at once
      const { data, error } = await supabase
        .from('cart_items')
        .insert(cartItems)
        .select();

      if (error) {
        console.error('🔴 [Reorder] Insert error:', error);
        throw error;
      }

      console.log('✅ [Reorder] Successfully added items:', data?.length);

      toast({
        title: "Reorder Successful",
        description: `${cartItems.length} item${cartItems.length > 1 ? 's' : ''} added to cart`,
        action: (
          <Button 
            size="sm" 
            onClick={() => navigate('/portal/cart')}
            className="bg-[hsl(var(--tl-gold-500))] hover:bg-[hsl(var(--tl-gold-600))]"
          >
            View Cart
          </Button>
        ),
      });

      // Close the mobile detail dialog if open
      setSelectedOrderForDetail(null);
      
    } catch (error: any) {
      console.error('🔴 [Reorder] Error:', error);
      
      // Check for specific error types
      const errorMessage = error?.message?.includes('duplicate')
        ? "Some items are already in your cart."
        : "Failed to add items to cart. Please try again.";
      
      toast({
        title: "Reorder Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleAddressSelect = async (addressId: string) => {
    if (!selectedOrderForAddress) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          delivery_address_id: addressId,
          delivery_address_confirmed_at: new Date().toISOString()
        })
        .eq('id', selectedOrderForAddress.id);

      if (error) throw error;

      toast({
        title: "Address Updated",
        description: "Your delivery address has been confirmed.",
      });

      setAddressDialogOpen(false);
      setSelectedOrderForAddress(null);
      fetchOrders();
    } catch (error) {
      console.error('Error updating delivery address:', error);
      toast({
        title: "Error",
        description: "Failed to update delivery address",
        variant: "destructive",
      });
    }
  };

  const handleTrackOrder = async (order: Order) => {
    try {
      console.log('🔍 [Track Order] Starting tracking flow for order:', order.id, 'Status:', order.status);
      
      // Step 1: Check if token exists
      const { data: existingToken, error: tokenError } = await supabase
        .from('delivery_tracking_tokens')
        .select('token')
        .eq('order_id', order.id)
        .maybeSingle();

      console.log('🔑 [Track Order] Existing token check:', { existingToken, tokenError });

      if (existingToken && existingToken.token) {
        // Token exists, open tracking page
        const trackingUrl = `${window.location.origin}/track?token=${existingToken.token}`;
        console.log('✅ [Track Order] Opening tracking URL with existing token');
        window.open(trackingUrl, '_blank');
        return;
      }

      // Step 2: No token exists - check if order is shippable
      if (!['shipped', 'delivered'].includes(order.status)) {
        // Order not yet shipped, show appropriate message
        let message = "Tracking information will be available once your order ships.";
        let title = "Tracking Not Ready";
        
        switch (order.status) {
          case 'order_confirmed':
          case 'pending_payment':
            message = "Your order is confirmed. Tracking will be available after payment and shipping.";
            break;
          case 'payment_received':
            message = "Payment received. Your order will be processed and shipped soon.";
            break;
          case 'processing':
            message = "Your order is being processed. Tracking will be available once it ships.";
            title = "Order Being Processed";
            break;
          case 'ready_to_ship':
            message = "Your order is ready to ship. Tracking information will be available shortly.";
            title = "Ready to Ship";
            break;
          case 'cancelled':
            message = "This order has been cancelled.";
            title = "Order Cancelled";
            break;
          default:
            message = "Tracking will be available once your order is shipped.";
        }
        
        toast({
          title: title,
          description: message,
        });
        return;
      }

      // Step 3: Order is shipped/delivered but no token - generate one on the fly
      console.log('🔄 [Track Order] Order is shipped but no token exists. Generating...');
      
      toast({
        title: "Generating Tracking Link",
        description: "Please wait while we prepare your tracking information...",
      });

      const { data: newTokenData, error: generateError } = await supabase
        .rpc('generate_tracking_token_for_order', { p_order_id: order.id });

      console.log('🎫 [Track Order] Token generation result:', { newTokenData, generateError });

      if (generateError) {
        console.error('❌ [Track Order] Failed to generate token:', generateError);
        throw generateError;
      }

      // Type assertion for RPC response
      const tokenResponse = newTokenData as { success: boolean; token?: string; error?: string } | null;

      if (tokenResponse && tokenResponse.success && tokenResponse.token) {
        // Token generated successfully
        const trackingUrl = `${window.location.origin}/track?token=${tokenResponse.token}`;
        console.log('✅ [Track Order] Token generated, opening tracking URL');
        
        toast({
          title: "Tracking Ready",
          description: "Opening tracking page...",
        });

        setTimeout(() => {
          window.open(trackingUrl, '_blank');
        }, 500);
      } else {
        console.error('❌ [Track Order] Token generation returned error:', tokenResponse?.error);
        throw new Error(tokenResponse?.error || 'Failed to generate tracking token');
      }
      
    } catch (error) {
      console.error('🔴 [Track Order] Unexpected error:', error);
      toast({
        title: "Error",
        description: "Failed to load tracking information.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Address needed banner */}
      {orders.some(o => !o.delivery_address_id && ['payment_received', 'processing'].includes(o.status)) && (
        <Card className="border-tl-warning/30 bg-tl-warning/5 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-tl-warning mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-tl-warning">Delivery Address Required</h3>
                <p className="text-sm text-tl-text/70 mt-1">
                  Some of your orders are waiting for delivery address information. Please provide your delivery address to proceed with shipping.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <PortalPageHeader
          title="My Orders"
          subtitle="Track your order status and delivery information"
          totalCount={filteredOrders.length}
          totalIcon={Package}
          patternId="orders-grid"
          stats={[
            {
              label: "Pending",
              count: orders.filter(o => ['pending_payment', 'order_confirmed'].includes(o.status)).length,
              icon: Clock
            },
            {
              label: "In Transit",
              count: orders.filter(o => o.status === 'shipped').length,
              icon: Truck
            },
            {
              label: "Delivered",
              count: orders.filter(o => o.status === 'delivered').length,
              icon: CheckCircle
            }
          ]}
        />
      </Card>

      {/* Filters */}
      <Card className="bg-tl-surface/80 backdrop-blur-md border-tl-border shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-tl-muted" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-tl-surface border-tl-border"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-tl-surface border-tl-border">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                {orderStatusFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="border-tl-border hover:bg-tl-surface"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <OrdersEmptyState 
          filtered={orders.length > 0} 
          onClearFilters={() => {
            setSearchTerm('');
            setStatusFilter('all');
          }}
        />
      ) : isMobile ? (
        // Mobile View
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <MobileOrderCard
              key={order.id}
              order={order}
              onViewDetails={() => {
                setSelectedOrderForDetail(order);
                setDetailDialogOpen(true);
              }}
              onTrack={() => handleTrackOrder(order)}
              onReorder={() => handleReorder(order)}
              onViewInvoices={() => navigate('/portal/invoices')}
              onAddAddress={() => {
                setSelectedOrderForAddress(order);
                setAddressDialogOpen(true);
              }}
              onUploadPayment={() => {
                setSelectedOrderForPayment(order);
                setPaymentProofDialogOpen(true);
              }}
              onReportIssue={() => {
                setSelectedOrderForIssue(order);
                setReportIssueDialogOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        // Desktop View
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const StatusIcon = getStatusIcon(order.status);
            const showTimeline = ['order_confirmed', 'payment_received', 'processing', 'ready_to_ship', 'shipped', 'delivered'].includes(order.status);
            
            return (
              <Card key={order.id} className={`bg-tl-surface border-tl-border border-l-4 ${getStatusBorderColor(order.status)} hover:shadow-lg hover:border-tl-accent/30 transition-all duration-300`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 flex items-center gap-2 text-tl-primary">
                        <StatusIcon className="h-5 w-5 text-tl-accent" />
                        {order.order_number}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-tl-muted">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Ordered {new Date(order.created_at).toLocaleDateString()}
                        </div>
                        {order.estimated_delivery_date && (
                          <div className="flex items-center gap-1">
                            <Truck className="h-4 w-4" />
                            Expected {new Date(order.estimated_delivery_date).toLocaleDateString()}
                          </div>
                        )}
                        {order.tracking_number && (
                          <div className="font-mono text-xs bg-tl-accent/10 text-tl-accent px-2 py-1 rounded border border-tl-accent/30">
                            {order.tracking_number}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-semibold flex items-center gap-2 text-tl-text">
                          {getCurrencySymbol(order.currency)}{order.total_amount.toLocaleString()}
                          <Badge variant="outline" className={getCurrencyBadgeColor(order.currency)}>
                            {order.currency}
                          </Badge>
                        </div>
                      </div>
                      <OrderStatusBadge status={order.status} />
                      {order.has_active_issue && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Issue Reported
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Payment Rejected Alert */}
                  {(order.status === 'payment_rejected' || order.payment_rejected_at) && order.payment_status_reason && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-700 dark:text-red-400">Payment Issue</h4>
                          <p className="text-sm text-red-600 dark:text-red-300 mt-1">{order.payment_status_reason}</p>
                          <Button
                            size="sm"
                            className="mt-2 bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => {
                              setSelectedOrderForPayment(order);
                              setPaymentProofDialogOpen(true);
                            }}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Resubmit Payment Proof
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Pending Verification */}
                  {order.payment_proof_url && !order.payment_verified_at && !order.payment_rejected_at && (
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-600" />
                        <div>
                          <span className="font-medium text-amber-700 dark:text-amber-400">Payment Under Review</span>
                          <p className="text-sm text-amber-600 dark:text-amber-300">We're verifying your payment. This usually takes 1-2 business hours.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Partial Payment Balance Alert */}
                  {hasPartialPayment(order) && (
                    <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-amber-700 dark:text-amber-400">Balance Payment Required</h4>
                          <div className="mt-2 space-y-1 text-sm">
                            <p className="text-amber-600 dark:text-amber-300">
                              <span className="font-medium">Amount Received:</span> {order.currency} {(order.payment_amount_confirmed || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-amber-700 dark:text-amber-300 font-semibold">
                              <span className="font-medium">Balance Remaining:</span> {order.currency} {getBalanceRemaining(order).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          <p className="text-sm text-amber-600 dark:text-amber-300 mt-2">
                            Please complete the remaining payment to proceed with shipping.
                          </p>
                          <Button
                            size="sm"
                            className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => {
                              setSelectedOrderForPayment(order);
                              setPaymentProofDialogOpen(true);
                            }}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Balance Payment
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Timeline */}
                  {showTimeline && (
                    <OrderTimeline currentStatus={order.status} className="mb-6" />
                  )}

                  {order.order_items && order.order_items.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2 text-tl-text">Order Items:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {order.order_items.map((item, index) => (
                          <div key={index} className="text-sm bg-tl-bg p-2 rounded border border-tl-border">
                            <span className="font-medium text-tl-text">{item.product_name}</span>
                            <span className="text-tl-muted ml-2">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Payment Instructions for pending/payment_received orders */}
                    {['pending_payment', 'payment_received'].includes(order.status) && (
                      <div className="pt-4 border-t border-tl-border">
                        {showPaymentInstructions === order.id ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-tl-text">Payment Instructions</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPaymentInstructions(null)}
                                className="hover:bg-tl-bg"
                              >
                                Hide
                              </Button>
                            </div>
                            <OrderPaymentInstructions
                              orderNumber={order.order_number}
                              quoteNumber={order.quotes?.quote_number}
                              totalAmount={order.total_amount}
                              currency={order.currency}
                              emailSent={true}
                            />
                          </div>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setShowPaymentInstructions(order.id)}
                            className="w-full bg-tl-gradient hover:opacity-90"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            View Payment Instructions
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {order.status === 'pending_payment' && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => {
                            setSelectedOrderForPayment(order);
                            setPaymentProofDialogOpen(true);
                          }}
                          className="bg-tl-success hover:opacity-90"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Payment Proof
                        </Button>
                      )}
                      
                      {!order.delivery_address_id && ['payment_received', 'processing'].includes(order.status) && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => {
                            setSelectedOrderForAddress(order);
                            setAddressDialogOpen(true);
                          }}
                          className={`${
                            order.delivery_address_requested_at 
                              ? 'bg-tl-warning hover:opacity-90 animate-pulse border-2 border-tl-warning/60' 
                              : 'bg-tl-warning hover:opacity-90'
                          }`}
                        >
                          {order.delivery_address_requested_at && (
                            <Clock className="h-4 w-4 mr-2" />
                          )}
                          {!order.delivery_address_requested_at && (
                            <MapPin className="h-4 w-4 mr-2" />
                          )}
                          {order.delivery_address_requested_at 
                            ? `⚠️ Address Required - Requested ${formatDistanceToNow(new Date(order.delivery_address_requested_at), { addSuffix: true })}`
                            : 'Add Delivery Address'
                          }
                        </Button>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTrackOrder(order)}
                        className="border-tl-border hover:bg-tl-bg"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Track Order
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleReorder(order)}
                        className="border-tl-border hover:bg-tl-bg"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reorder
                      </Button>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedOrderForInvoice(order);
                          setInvoicePreviewOpen(true);
                        }}
                        className="border-tl-border hover:bg-tl-bg"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Invoice
                      </Button>

                      {/* Report Issue Button for shipped/delivered orders */}
                      {['shipped', 'delivered', 'delivery_failed'].includes(order.status) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedOrderForIssue(order);
                            setReportIssueDialogOpen(true);
                          }}
                          className="border-destructive text-destructive hover:bg-destructive/10"
                        >
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Report Issue
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Address Selection Dialog */}
      <AddressSelectionDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        onSelect={handleAddressSelect}
      />
      
      {/* Payment Proof Upload Dialog */}
      {selectedOrderForPayment && (
        <CustomerPaymentProofDialog
          open={paymentProofDialogOpen}
          onOpenChange={setPaymentProofDialogOpen}
          order={selectedOrderForPayment}
          onSuccess={fetchOrders}
        />
      )}

      {/* Invoice Preview Dialog */}
      {selectedOrderForInvoice && (
        <InvoicePreviewDialog
          open={invoicePreviewOpen}
          onOpenChange={setInvoicePreviewOpen}
          orderId={selectedOrderForInvoice.id}
          orderNumber={selectedOrderForInvoice.order_number}
        />
      )}

      {/* Mobile Order Detail Dialog */}
      <MobileOrderDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        order={selectedOrderForDetail}
        onTrack={() => {
          if (selectedOrderForDetail) {
            handleTrackOrder(selectedOrderForDetail);
          }
        }}
        onReorder={() => {
          if (selectedOrderForDetail) {
            handleReorder(selectedOrderForDetail);
          }
        }}
        onViewInvoices={() => navigate('/portal/invoices')}
        onAddAddress={() => {
          if (selectedOrderForDetail) {
            setSelectedOrderForAddress(selectedOrderForDetail);
            setAddressDialogOpen(true);
            setDetailDialogOpen(false);
          }
        }}
        onUploadPayment={() => {
          if (selectedOrderForDetail) {
            setSelectedOrderForPayment(selectedOrderForDetail);
            setPaymentProofDialogOpen(true);
            setDetailDialogOpen(false);
          }
        }}
        onReportIssue={() => {
          if (selectedOrderForDetail) {
            setSelectedOrderForIssue(selectedOrderForDetail);
            setReportIssueDialogOpen(true);
            setDetailDialogOpen(false);
          }
        }}
      />

      {/* Order Issue Report Dialog */}
      {selectedOrderForIssue && (
        <OrderIssueReportDialog
          open={reportIssueDialogOpen}
          onOpenChange={setReportIssueDialogOpen}
          orderId={selectedOrderForIssue.id}
          orderNumber={selectedOrderForIssue.order_number}
        />
      )}
    </div>
  );
};