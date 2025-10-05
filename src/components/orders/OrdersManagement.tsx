import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  quotes: {
    quote_number: string;
    title: string;
  };
  customers: {
    company_name: string;
    contact_name?: string;
  };
  order_items: any[];
}

const OrdersManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const { toast } = useToast();

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
          quotes(quote_number, title),
          customers(company_name, contact_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch order items separately to avoid join issues
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

      setOrders(ordersWithItems as Order[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: any) => {
    try {
      // Get order details first
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          *,
          quotes(
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

      if (error) throw error;

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

      toast({
        title: "Success",
        description: `Order status updated to ${status.replace(/_/g, ' ')}`,
      });

      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
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

      toast({
        title: "Sending tracking link...",
        description: "Please wait while we send the order tracking link.",
      });

      const { data, error } = await supabase.functions.invoke('send-order-tracking-link', {
        body: {
          orderId: order.id,
          customerEmail: customerEmail,
          customerName: order.customers?.contact_name,
          companyName: order.customers?.company_name
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order tracking link sent successfully to " + customerEmail,
      });
    } catch (error: any) {
      console.error('Error sending order tracking link:', error);
      toast({
        title: "Error",
        description: "Failed to send order tracking link",
        variant: "destructive",
      });
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
    
    const matchesTab = selectedTab === 'all' || order.status === selectedTab;
    
    return matchesSearch && matchesTab;
  });

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
            Track and manage orders converted from accepted quotes
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
          <TabsTrigger value="order_confirmed">Confirmed ({orders.filter(o => o.status === 'order_confirmed').length})</TabsTrigger>
          <TabsTrigger value="payment_received">Payment ({orders.filter(o => o.status === 'payment_received').length})</TabsTrigger>
          <TabsTrigger value="processing">Processing ({orders.filter(o => o.status === 'processing').length})</TabsTrigger>
          <TabsTrigger value="ready_to_ship">Ready ({orders.filter(o => o.status === 'ready_to_ship').length})</TabsTrigger>
          <TabsTrigger value="shipped">Shipped ({orders.filter(o => o.status === 'shipped').length})</TabsTrigger>
          <TabsTrigger value="delivered">Delivered ({orders.filter(o => o.status === 'delivered').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500">
                  Orders are automatically created when quotes are accepted by customers.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map(order => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        {order.order_number}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                        <Badge variant="outline">
                          From Quote: {order.quotes.quote_number}
                        </Badge>
                        <Badge variant="outline">
                          {order.order_items.length} Item(s)
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {order.currency} {order.total_amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.customers.company_name}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Order Items:</h4>
                      <div className="space-y-1">
                        {order.order_items.map(item => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.product_name}</span>
                            <span>
                              {item.quantity} {item.unit} × {order.currency} {item.unit_price} = 
                              {order.currency} {item.total_price.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(order.created_at).toLocaleDateString()}
                        </p>
                        {order.expected_delivery_date && (
                          <p className="text-sm text-muted-foreground">
                            Expected Delivery: {new Date(order.expected_delivery_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {order.status === 'order_confirmed' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'payment_received')}
                          >
                            Confirm Payment
                          </Button>
                        )}
                        {order.status === 'payment_received' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'processing')}
                          >
                            Start Processing
                          </Button>
                        )}
                        {order.status === 'processing' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'ready_to_ship')}
                          >
                            Mark Ready to Ship
                          </Button>
                        )}
                        {order.status === 'ready_to_ship' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'shipped')}
                          >
                            Mark as Shipped
                          </Button>
                        )}
                        {order.status === 'shipped' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'delivered')}
                          >
                            Mark as Delivered
                          </Button>
                        )}
                        {order.status === 'delivery_failed' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'shipped')}
                          >
                            Retry Delivery
                          </Button>
                        )}
                        {!['delivered', 'cancelled'].includes(order.status) && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => sendOrderTrackingLink(order)}
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            📧 Send Tracking Link
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrdersManagement;