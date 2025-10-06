import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, MapPin, Calendar, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface OrderDetails {
  order_id: string;
  order_number: string;
  status: string;
  tracking_number: string | null;
  carrier: string | null;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  delivery_notes: string | null;
  customer_name: string;
  delivery_address: string;
}

const OrderTracking = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchOrderDetails();
    } else {
      setError('No tracking token provided');
      setLoading(false);
    }
  }, [token]);

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_order_by_tracking_token', { p_token: token });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setOrder(data[0]);
      } else {
        setError('Invalid or expired tracking link');
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-blue-500" />;
      case 'processing':
      case 'ready_to_ship':
        return <Package className="h-5 w-5 text-orange-500" />;
      case 'delivery_failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'default';
      case 'shipped':
        return 'outline';
      case 'delivery_failed':
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Tracking Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Track Your Order</h1>
          <p className="text-muted-foreground">Order #{order.order_number}</p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(order.status)}
                Order Status
              </CardTitle>
              <Badge variant={getStatusColor(order.status) as any}>
                {formatStatus(order.status)}
              </Badge>
            </div>
            <CardDescription>Last updated: {format(new Date(order.created_at), 'PPp')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.tracking_number && (
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Tracking Number</p>
                  <p className="text-sm text-muted-foreground">{order.tracking_number}</p>
                  {order.carrier && (
                    <p className="text-xs text-muted-foreground mt-1">Carrier: {order.carrier}</p>
                  )}
                </div>
              </div>
            )}

            {order.delivery_address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Delivery Address</p>
                  <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                </div>
              </div>
            )}

            {order.estimated_delivery_date && !order.actual_delivery_date && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Estimated Delivery</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(order.estimated_delivery_date), 'PPPP')}
                  </p>
                </div>
              </div>
            )}

            {order.actual_delivery_date && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Delivered</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(order.actual_delivery_date), 'PPPP')}
                  </p>
                </div>
              </div>
            )}

            {order.delivery_notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1">Delivery Notes</p>
                  <p className="text-sm text-muted-foreground">{order.delivery_notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                  </div>
                  {(order.shipped_at || order.delivered_at) && (
                    <div className="w-0.5 h-full bg-border my-1"></div>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className="font-medium text-sm">Order Confirmed</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(order.created_at), 'PPp')}
                  </p>
                </div>
              </div>

              {order.shipped_at && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                    </div>
                    {order.delivered_at && (
                      <div className="w-0.5 h-full bg-border my-1"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-medium text-sm">Shipped</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.shipped_at), 'PPp')}
                    </p>
                  </div>
                </div>
              )}

              {order.delivered_at && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Delivered</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.delivered_at), 'PPp')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Questions about your order? Contact us at{' '}
              <a href="mailto:support@trustlinkventures.com" className="text-primary hover:underline">
                support@trustlinkventures.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderTracking;
