import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Search, Truck, Eye, RotateCcw, Calendar, DollarSign, Download, MapPin, AlertCircle, Upload, CreditCard, Clock } from 'lucide-react';
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
import { InvoicePreviewDialog } from './InvoicePreviewDialog';
import { OrderTimeline } from '@/components/orders/OrderTimeline';


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
  order_items?: any[];
  quotes?: {
    quote_number: string;
    customers?: {
      company_name: string;
      contact_name: string;
    };
  };
}

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
    
    if (orderIdNeedingAddress && orders.length > 0) {
      const order = orders.find(o => o.id === orderIdNeedingAddress);
      if (order && !order.delivery_address_id) {
        setSelectedOrderForAddress(order);
        setAddressDialogOpen(true);
        // Clear the query param
        window.history.replaceState({}, '', '/customer/orders');
      }
    }
  }, [orders]);

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
          description: `Your account (${profile.email}) is not linked to a customer profile. Please contact support at support@trustlinkventures.com`,
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
          quotes(
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

      console.log('✅ Orders data:', ordersData);
      console.log('🔍 DEBUG - Number of orders found:', ordersData?.length || 0);
      setOrders(ordersData || []);
      
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'quote_pending': return 'bg-tl-muted/20 text-tl-muted border-tl-border';
      case 'quote_sent': return 'bg-tl-accent/10 text-tl-accent border-tl-accent/30';
      case 'order_confirmed': return 'bg-tl-info/10 text-tl-info border-tl-info/30';
      case 'payment_received': return 'bg-tl-success/10 text-tl-success border-tl-success/30';
      case 'processing': return 'bg-tl-warning/10 text-tl-warning border-tl-warning/30';
      case 'ready_to_ship': return 'bg-tl-primary/10 text-tl-primary border-tl-primary/30';
      case 'shipped': return 'bg-tl-warning/10 text-tl-warning border-tl-warning/30';
      case 'delivered': return 'bg-tl-success/10 text-tl-success border-tl-success/30';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'delivery_failed': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-tl-muted/20 text-tl-muted border-tl-border';
    }
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
    switch (status) {
      case 'quote_pending':
      case 'quote_sent':
      case 'order_confirmed':
      case 'payment_received':
      case 'processing':
      case 'ready_to_ship':
      case 'delivered':
        return Package;
      case 'shipped':
        return Truck;
      default:
        return Package;
    }
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

      // Add each order item to the cart
      for (const item of order.order_items) {
        await supabase.from('cart_items').insert({
          user_id: user.id,
          product_name: item.product_name,
          product_description: item.product_description,
          quantity: item.quantity,
          unit: item.unit,
          specifications: item.specifications,
        });
      }

      toast({
        title: "Reorder Successful",
        description: `${order.order_items.length} items from ${order.order_number} have been added to your cart.`,
      });

      // Navigate to cart
      navigate('/customer/cart');
    } catch (error) {
      console.error('Error reordering:', error);
      toast({
        title: "Reorder Failed",
        description: "Failed to add items to cart. Please try again.",
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
      // Fetch tracking token for this order
      const { data, error } = await supabase
        .from('delivery_tracking_tokens')
        .select('token')
        .eq('order_id', order.id)
        .single();

      if (error || !data) {
        toast({
          title: "Tracking Unavailable",
          description: "Tracking information is not yet available for this order.",
          variant: "destructive",
        });
        return;
      }

      // Navigate to public tracking page with token (in-app navigation for mobile)
      console.log('🔵 Navigating to track page:', data.token);
      navigate(`/track?token=${data.token}`);
    } catch (error) {
      console.error('Error fetching tracking token:', error);
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-tl-gradient bg-clip-text text-transparent">
            My Orders
          </h1>
          <p className="text-tl-muted">
            Track your order status and delivery information
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2 bg-tl-surface border-tl-border">
          <Package className="h-4 w-4 mr-2" />
          {filteredOrders.length} Orders
        </Badge>
      </div>

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
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="quote_pending">Quote Pending</SelectItem>
                <SelectItem value="quote_sent">Quote Sent</SelectItem>
                <SelectItem value="order_confirmed">Order Confirmed</SelectItem>
                <SelectItem value="payment_received">Payment Received</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="delivery_failed">Delivery Failed</SelectItem>
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
        <Card className="text-center py-12 bg-tl-surface border-tl-border">
          <CardContent>
            <div className="mx-auto mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-tl-gradient/10">
              <Package className="h-8 w-8 text-tl-accent" />
            </div>
            <h3 className="text-xl font-semibold text-tl-primary mb-2">No orders found</h3>
            <p className="text-tl-muted mb-6">
              {orders.length === 0 
                ? "You haven't placed any orders yet." 
                : "No orders match your current filters."
              }
            </p>
            {orders.length === 0 && (
              <Button asChild className="bg-tl-gradient hover:opacity-90">
                <a href="/customer/catalog">Browse Products</a>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : isMobile ? (
        // Mobile View
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <MobileOrderCard
              key={order.id}
              order={order}
              onTrack={() => handleTrackOrder(order)}
              onReorder={() => handleReorder(order)}
              onViewInvoices={() => navigate('/customer/invoices')}
              onAddAddress={() => {
                setSelectedOrderForAddress(order);
                setAddressDialogOpen(true);
              }}
              onUploadPayment={() => {
                setSelectedOrderForPayment(order);
                setPaymentProofDialogOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        // Desktop View
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const StatusIcon = getStatusIcon(order.status);
            const showTimeline = ['quote_sent', 'order_confirmed', 'payment_received', 'ready_to_ship', 'shipped', 'in_transit', 'delivered'].includes(order.status);
            
            return (
              <Card key={order.id} className="bg-tl-surface border-tl-border hover:shadow-lg hover:border-tl-accent/30 transition-all duration-300">
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
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
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
    </div>
  );
};