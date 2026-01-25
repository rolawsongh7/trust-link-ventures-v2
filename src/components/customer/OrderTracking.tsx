import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  Truck, 
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  ArrowLeft,
  Download,
  AlertTriangle
} from 'lucide-react';
import { ProofOfDeliverySection } from './ProofOfDeliverySection';
import { OrderIssueReportDialog } from './OrderIssueReportDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OrderItem {
  id: string;
  product_name: string;
  product_description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  payment_confirmed_at?: string;
  processing_started_at?: string;
  ready_to_ship_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  estimated_delivery_date?: string;
  delivery_address_id?: string;
  delivery_proof_url?: string;
  proof_of_delivery_url?: string;
  delivery_signature?: string;
  order_items: OrderItem[];
  quotes?: {
    quote_number: string;
    customers?: {
      company_name: string;
      contact_name: string;
    };
  };
}

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: FileText },
  { key: 'payment_received', label: 'Payment Confirmed', icon: DollarSign },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'ready_to_ship', label: 'Ready to Ship', icon: CheckCircle },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
];

export const OrderTracking: React.FC = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReportIssue, setShowReportIssue] = useState(false);

  useEffect(() => {
    if (token) {
      fetchOrderByToken();
    } else if (orderId) {
      fetchOrderById();
    }
  }, [orderId, token]);

  // Subscribe to real-time updates for the order
  useEffect(() => {
    if (!order?.id) return;

    const channel = supabase
      .channel(`order-tracking-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          console.log('[OrderTracking] Order updated:', payload);
          // Refresh the order data when it's updated
          fetchOrderDetails(order.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  const fetchOrderByToken = async () => {
    try {
      setLoading(true);
      
      // Validate token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('validate_magic_link_token', { p_token: token });

      if (tokenError || !tokenData || tokenData.length === 0) {
        throw new Error('Invalid or expired tracking link');
      }

      const validToken = tokenData[0];
      
      if (!validToken.is_valid || !validToken.order_id) {
        throw new Error('Invalid or expired tracking link');
      }

      // Fetch order details
      await fetchOrderDetails(validToken.order_id);
      
    } catch (err: any) {
      console.error('Error fetching order by token:', err);
      setError(err.message || 'Failed to load order tracking information');
      toast({
        title: "Error",
        description: err.message || 'Failed to load order tracking information',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderById = async () => {
    if (!orderId) return;
    
    try {
      setLoading(true);
      await fetchOrderDetails(orderId);
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError('Failed to load order information');
      toast({
        title: "Error",
        description: 'Failed to load order information',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (id: string) => {
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*),
        quotes!quote_id(
          quote_number,
          customers(company_name, contact_name)
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    setOrder(data);
  };

  const getCurrentStepIndex = (status: string) => {
    const statusMap: { [key: string]: number } = {
      'pending': 0,
      'payment_received': 1,
      'processing': 2,
      'ready_to_ship': 3,
      'shipped': 4,
      'delivered': 5,
      'cancelled': -1,
      'delivery_failed': -1,
    };
    return statusMap[status] ?? 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'shipped': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready_to_ship': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'processing': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'payment_received': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'delivery_failed': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEstimatedDeliveryDate = () => {
    if (!order) return null;
    
    if (order.estimated_delivery_date) {
      return new Date(order.estimated_delivery_date);
    }

    // Calculate based on status and creation date
    const createdDate = new Date(order.created_at);
    const currentStep = getCurrentStepIndex(order.status);
    
    // Rough estimate: 14 days from order creation
    const estimatedDays = 14 - (currentStep * 2);
    const estimatedDate = new Date(createdDate);
    estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);
    
    return estimatedDate;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-48 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center py-12">
            <CardContent>
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Order Not Found</h3>
              <p className="text-muted-foreground mb-6">
                {error || 'The order you are looking for could not be found.'}
              </p>
              <Button asChild>
                <a href="/portal/orders">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Orders
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex(order.status);
  const estimatedDelivery = getEstimatedDeliveryDate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Track Order
            </h1>
            <p className="text-muted-foreground">
              Order #{order.order_number}
            </p>
          </div>
          <Badge className={getStatusColor(order.status)} variant="outline">
            {order.status.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Order Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Total Amount</p>
                  <p className="text-sm text-muted-foreground">
                    {order.currency} {order.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>

              {estimatedDelivery && (
                <div className="flex items-start gap-3">
                  <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Est. Delivery</p>
                    <p className="text-sm text-muted-foreground">
                      {estimatedDelivery.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {order.quotes?.customers && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1">Customer</p>
                  <p className="text-sm text-muted-foreground">
                    {order.quotes.customers.company_name} - {order.quotes.customers.contact_name}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tracking Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Order Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />
              <div 
                className="absolute left-6 top-0 w-0.5 bg-primary transition-all duration-500"
                style={{ 
                  height: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` 
                }}
              />

              {/* Steps */}
              <div className="space-y-8">
                {statusSteps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <div key={step.key} className="relative flex items-start gap-4">
                      {/* Icon */}
                      <div 
                        className={`
                          relative z-10 w-12 h-12 rounded-full flex items-center justify-center
                          transition-all duration-300
                          ${isCompleted 
                            ? 'bg-primary text-primary-foreground shadow-lg scale-110' 
                            : 'bg-muted text-muted-foreground'
                          }
                          ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                        `}
                      >
                        <StepIcon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pt-2">
                        <h4 className={`font-semibold ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}
                        </h4>
                        {isCompleted && (
                          <p className="text-sm text-muted-foreground">
                            {index === 0 && order.created_at && 
                              `Completed on ${new Date(order.created_at).toLocaleDateString()}`}
                            {index === 1 && order.payment_confirmed_at && 
                              `Completed on ${new Date(order.payment_confirmed_at).toLocaleDateString()}`}
                            {index === 2 && order.processing_started_at && 
                              `Started on ${new Date(order.processing_started_at).toLocaleDateString()}`}
                            {index === 3 && order.ready_to_ship_at && 
                              `Ready on ${new Date(order.ready_to_ship_at).toLocaleDateString()}`}
                            {index === 4 && order.shipped_at && 
                              `Shipped on ${new Date(order.shipped_at).toLocaleDateString()}`}
                            {index === 5 && order.delivered_at && 
                              `Delivered on ${new Date(order.delivered_at).toLocaleDateString()}`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.order_items.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-start justify-between p-4 bg-muted/30 rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{item.product_name}</h4>
                    {item.product_description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.product_description}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      {item.quantity} {item.unit} × {order.currency} {item.unit_price.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {order.currency} {item.total_price.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />
            
            <div className="flex items-center justify-between">
              <span className="font-semibold text-lg">Total</span>
              <span className="font-bold text-xl">
                {order.currency} {order.total_amount.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Proof of Delivery */}
        {(order.status === 'delivered' || order.status === 'shipped') && (
          <ProofOfDeliverySection
            deliveryProofUrl={order.delivery_proof_url}
            proofOfDeliveryUrl={order.proof_of_delivery_url}
            deliverySignature={order.delivery_signature}
            deliveredAt={order.delivered_at}
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="outline" asChild>
            <a href="/portal/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </a>
          </Button>
          
          {order.quotes && (
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Invoice
            </Button>
          )}

          {/* Report Issue - only for shipped/delivered orders */}
          {['shipped', 'delivered', 'delivery_failed'].includes(order.status) && (
            <Button 
              variant="outline" 
              onClick={() => setShowReportIssue(true)}
              className="text-destructive hover:text-destructive"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report Issue
            </Button>
          )}
        </div>

        {/* Report Issue Dialog */}
        <OrderIssueReportDialog
          open={showReportIssue}
          onOpenChange={setShowReportIssue}
          orderId={order.id}
          orderNumber={order.order_number}
        />
      </div>
    </div>
  );
};
