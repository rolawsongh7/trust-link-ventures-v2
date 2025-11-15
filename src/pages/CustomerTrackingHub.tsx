import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Clock, CheckCircle2, TruckIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EnterpriseShipmentCard } from '@/components/customer/EnterpriseShipmentCard';
import { ShipmentCardSkeleton } from '@/components/customer/ShipmentCardSkeleton';

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
  carrier_name?: string;
  shipped_at?: string;
  delivered_at?: string;
  order_items?: any[];
  customer_addresses?: {
    receiver_name: string;
    ghana_digital_address: string;
    city: string;
    region: string;
  };
  invoices?: {
    invoice_number: string;
    file_url: string;
  }[];
}

const CustomerTrackingHub = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const { profile } = useCustomerAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.email) {
      fetchOrders();

      // Set up real-time subscription
      const channel = supabase
        .channel('tracking-hub-updates')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            console.log('Order update:', payload);
            
            if (payload.eventType === 'UPDATE') {
              const updatedOrder = payload.new as Order;
              
              // Show toast notification for status changes
              if (payload.old.status !== updatedOrder.status) {
                toast({
                  title: "Order Status Updated",
                  description: `Order ${updatedOrder.order_number} is now ${formatStatus(updatedOrder.status)}`,
                });
              }
              
              fetchOrders();
            }
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [profile]);

  const fetchOrders = async () => {
    if (!profile?.email) return;

    try {
      setLoading(true);

      // Find the customer record
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', profile.email)
        .maybeSingle();

      if (customerError) throw customerError;
      if (!customerData) {
        setOrders([]);
        return;
      }

      // Fetch orders with related data
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            total_price
          ),
          customer_addresses (
            receiver_name,
            ghana_digital_address,
            city,
            region
          ),
          invoices (
            invoice_number,
            file_url
          )
        `)
        .eq('customer_id', customerData.id)
        .not('status', 'in', '("cancelled","draft")')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load shipments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusCounts = () => {
    const inTransit = orders.filter(o => 
      ['shipped', 'out_for_delivery'].includes(o.status)
    ).length;
    
    const arrivingToday = orders.filter(o => {
      if (!o.estimated_delivery_date) return false;
      const today = new Date().toDateString();
      return new Date(o.estimated_delivery_date).toDateString() === today;
    }).length;
    
    const processing = orders.filter(o => 
      ['processing', 'ready_to_ship'].includes(o.status)
    ).length;
    
    const delivered = orders.filter(o => o.status === 'delivered').length;

    return { inTransit, arrivingToday, processing, delivered };
  };

  const filterOrders = (orders: Order[]) => {
    let filtered = orders;

    // Filter by tab
    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'in-transit':
          filtered = filtered.filter(o => ['shipped', 'out_for_delivery'].includes(o.status));
          break;
        case 'arriving-today':
          filtered = filtered.filter(o => {
            if (!o.estimated_delivery_date) return false;
            const today = new Date().toDateString();
            return new Date(o.estimated_delivery_date).toDateString() === today;
          });
          break;
        case 'processing':
          filtered = filtered.filter(o => ['order_confirmed', 'payment_confirmed', 'processing', 'ready_to_ship'].includes(o.status));
          break;
        case 'delivered':
          filtered = filtered.filter(o => o.status === 'delivered');
          break;
      }
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(o => 
        o.order_number.toLowerCase().includes(search) ||
        o.tracking_number?.toLowerCase().includes(search) ||
        o.order_items?.some(item => 
          item.product_name.toLowerCase().includes(search)
        )
      );
    }

    return filtered;
  };

  const counts = getStatusCounts();
  const filteredOrders = filterOrders(orders);
  const activeOrders = filteredOrders.filter(o => o.status !== 'delivered');
  const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered');

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Track Shipments</h1>
          <p className="text-muted-foreground">Monitor your orders in real-time</p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number, tracking number, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <TruckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">In Transit</span>
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{counts.inTransit}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-900 dark:text-orange-100">Arriving Today</span>
            </div>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{counts.arrivingToday}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Processing</span>
            </div>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{counts.processing}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Delivered</span>
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{counts.delivered}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            All
          </TabsTrigger>
          <TabsTrigger value="in-transit" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            In Transit
            {counts.inTransit > 0 && (
              <Badge variant="secondary" className="ml-2">{counts.inTransit}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="arriving-today" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Today
            {counts.arrivingToday > 0 && (
              <Badge variant="secondary" className="ml-2">{counts.arrivingToday}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="processing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Processing
          </TabsTrigger>
          <TabsTrigger value="delivered" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Delivered
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <ShipmentCardSkeleton key={i} delay={i * 100} />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No shipments found</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm ? "Try adjusting your search" : "You don't have any shipments yet"}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => navigate('/portal/catalog')}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Browse Products
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Active Shipments */}
              {activeOrders.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <TruckIcon className="h-5 w-5" />
                    Active Shipments
                  </h2>
                  <div className="space-y-4">
                    {activeOrders.map((order, index) => (
                      <EnterpriseShipmentCard
                        key={order.id}
                        order={order}
                        delay={index * 100}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Delivered Orders */}
              {deliveredOrders.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Recent Deliveries
                  </h2>
                  <div className="space-y-4">
                    {deliveredOrders.map((order, index) => (
                      <EnterpriseShipmentCard
                        key={order.id}
                        order={order}
                        delay={index * 100}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerTrackingHub;
