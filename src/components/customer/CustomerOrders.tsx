import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Search, Truck, Eye, RotateCcw, Calendar, DollarSign } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useToast } from '@/hooks/use-toast';

// Placeholder interface for orders - this would be expanded based on actual order schema
interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  expected_delivery?: string;
  tracking_number?: string;
  items: any[];
}

export const CustomerOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { profile } = useCustomerAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Simulated data - in real implementation, fetch from Supabase
    setTimeout(() => {
      setOrders([
        {
          id: '1',
          order_number: 'ORD-2024-001',
          total_amount: 15000,
          currency: 'USD',
          status: 'processing',
          created_at: '2024-01-15T10:00:00Z',
          expected_delivery: '2024-02-15',
          tracking_number: 'TRK123456789',
          items: [
            { name: 'Premium Beef Cuts', quantity: 500, unit: 'kg' },
            { name: 'Fresh Salmon Fillets', quantity: 200, unit: 'kg' }
          ]
        },
        {
          id: '2',
          order_number: 'ORD-2024-002',
          total_amount: 8500,
          currency: 'USD',
          status: 'shipped',
          created_at: '2024-01-10T14:30:00Z',
          expected_delivery: '2024-02-10',
          tracking_number: 'TRK987654321',
          items: [
            { name: 'Organic Chicken Breast', quantity: 300, unit: 'kg' }
          ]
        },
        {
          id: '3',
          order_number: 'ORD-2024-003',
          total_amount: 22000,
          currency: 'USD',
          status: 'delivered',
          created_at: '2024-01-05T09:15:00Z',
          expected_delivery: '2024-02-05',
          items: [
            { name: 'Premium Tuna', quantity: 400, unit: 'kg' },
            { name: 'Fresh Prawns', quantity: 150, unit: 'kg' }
          ]
        }
      ]);
      setLoading(false);
    }, 1000);
  }, [profile]);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing': return Package;
      case 'shipped': return Truck;
      case 'delivered': return Package;
      default: return Package;
    }
  };

  const handleReorder = (order: Order) => {
    toast({
      title: "Reorder Initiated",
      description: `Items from ${order.order_number} have been added to your cart.`,
    });
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
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
                        {order.expected_delivery && (
                          <div className="flex items-center gap-1">
                            <Truck className="h-4 w-4" />
                            Expected {new Date(order.expected_delivery).toLocaleDateString()}
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
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Order Items:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="text-sm bg-muted/50 p-2 rounded">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground ml-2">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    
                    {order.tracking_number && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`#track/${order.tracking_number}`} target="_blank">
                          <Truck className="h-4 w-4 mr-2" />
                          Track Package
                        </a>
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleReorder(order)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reorder
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