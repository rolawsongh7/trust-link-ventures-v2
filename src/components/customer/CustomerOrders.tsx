import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Search, Truck, Eye, RotateCcw, Calendar, DollarSign, Download } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';


// Order interface matching database schema
interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  estimated_delivery_date?: string;
  tracking_number?: string;
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
  const { profile } = useCustomerAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const fetchOrders = async () => {
    if (!profile?.email) return;

    try {
      setLoading(true);

      // First, get the customer record
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', profile.email)
        .single();

      if (!customer) {
        setOrders([]);
        return;
      }

      // Fetch orders with related data
      const { data: ordersData, error } = await supabase
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

      if (error) throw error;

      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
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
      case 'quote_pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'quote_sent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'order_confirmed': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'payment_received': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'processing': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ready_to_ship': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'shipped': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'delivery_failed': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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

  const handleDownloadInvoice = async (orderId: string, orderNumber: string) => {
    try {
      toast({
        title: "Generating Invoice",
        description: "Please wait while we generate your invoice...",
      });

      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: { orderId, type: 'commercial' }
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0))], { 
        type: 'application/pdf' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Invoice Downloaded",
        description: `Invoice for ${orderNumber} has been downloaded.`,
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download invoice. Please try again.",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            My Orders
          </h1>
          <p className="text-muted-foreground">
            Track your order status and delivery information
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Package className="h-4 w-4 mr-2" />
          {filteredOrders.length} Orders
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground mb-6">
              {orders.length === 0 
                ? "You haven't placed any orders yet." 
                : "No orders match your current filters."
              }
            </p>
            {orders.length === 0 && (
              <Button asChild>
                <a href="/customer/catalog">Browse Products</a>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const StatusIcon = getStatusIcon(order.status);
            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 flex items-center gap-2">
                        <StatusIcon className="h-5 w-5" />
                        {order.order_number}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                          <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {order.tracking_number}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-semibold flex items-center">
                          <DollarSign className="h-4 w-4" />
                          {order.total_amount.toLocaleString()} {order.currency}
                        </div>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Order Items:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {order.order_items.map((item, index) => (
                          <div key={index} className="text-sm bg-muted/50 p-2 rounded">
                            <span className="font-medium">{item.product_name}</span>
                            <span className="text-muted-foreground ml-2">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/customer/orders/${order.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Track Order
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleReorder(order)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reorder
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadInvoice(order.id, order.order_number)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Invoice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};