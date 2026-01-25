import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Package, MapPin, Calendar, Truck, CheckCircle2, Clock, AlertCircle, FileText, Download, AlertTriangle } from 'lucide-react';
import { ProofOfDeliverySection } from '@/components/customer/ProofOfDeliverySection';
import { format } from 'date-fns';
import { OrderStatusDisplay } from '@/components/customer/OrderStatusDisplay';

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
  delivery_window?: string | null;
  delivery_proof_url?: string | null;
  proof_of_delivery_url?: string | null;
  delivery_signature?: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  file_url: string | null;
  status: string;
}

const OrderTracking = () => {
  const [searchParams] = useSearchParams();
  const { orderId: routeOrderId } = useParams<{ orderId: string }>();
  const token = searchParams.get('token');
  // Also support orderId as query param for fallback/public access
  const queryOrderId = searchParams.get('orderId');
  const orderId = routeOrderId || queryOrderId;
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Support both token-based (public) and orderId-based (authenticated) access
    if (token) {
      fetchOrderByToken();
    } else if (orderId) {
      fetchOrderById(orderId);
    } else {
      setError('No tracking token or order ID provided');
      setLoading(false);
    }
  }, [token, orderId]);

  // Fetch order by direct order ID (for authenticated users from customer portal)
  const fetchOrderById = async (id: string) => {
    try {
      console.log('🔍 [OrderTracking] Fetching order by ID:', id);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          tracking_number,
          carrier,
          carrier_name,
          estimated_delivery_date,
          actual_delivery_date,
          created_at,
          shipped_at,
          delivered_at,
          delivery_notes,
          delivery_window,
          delivery_proof_url,
          proof_of_delivery_url,
          delivery_signature,
          customer_id,
          delivery_address_id
        `)
        .eq('id', id)
        .single();

      if (orderError) {
        console.error('❌ [OrderTracking] Order fetch error:', orderError);
        setError('Unable to load order. You may need to log in to view this order.');
        setLoading(false);
        return;
      }

      if (!orderData) {
        setError('Order not found');
        setLoading(false);
        return;
      }

      console.log('📦 [OrderTracking] Order data loaded:', orderData);

      // Fetch customer info
      const { data: customerData } = await supabase
        .from('customers')
        .select('company_name, contact_name')
        .eq('id', orderData.customer_id)
        .single();

      // Fetch delivery address
      let deliveryAddress = 'Address not available';
      if (orderData.delivery_address_id) {
        const { data: addressData } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('id', orderData.delivery_address_id)
          .single();

        if (addressData) {
          deliveryAddress = `${addressData.street_address}, ${addressData.area ? addressData.area + ', ' : ''}${addressData.city}, ${addressData.region} - ${addressData.ghana_digital_address}`;
        }
      }

      // Format order data
      const formattedOrder: OrderDetails = {
        order_id: orderData.id,
        order_number: orderData.order_number,
        status: orderData.status,
        tracking_number: orderData.tracking_number,
        carrier: orderData.carrier || orderData.carrier_name,
        estimated_delivery_date: orderData.estimated_delivery_date,
        actual_delivery_date: orderData.actual_delivery_date,
        created_at: orderData.created_at,
        shipped_at: orderData.shipped_at,
        delivered_at: orderData.delivered_at,
        delivery_notes: orderData.delivery_notes,
        delivery_window: orderData.delivery_window,
        delivery_proof_url: orderData.delivery_proof_url,
        proof_of_delivery_url: orderData.proof_of_delivery_url,
        delivery_signature: orderData.delivery_signature,
        customer_name: customerData?.company_name || customerData?.contact_name || 'Customer',
        delivery_address: deliveryAddress
      };

      setOrder(formattedOrder);

      // Fetch invoices for this order
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_type, file_url, status')
        .eq('order_id', id)
        .in('invoice_type', ['commercial', 'packing_list'])
        .not('file_url', 'is', null);

      if (invoicesData) {
        setInvoices(invoicesData);
      }

      console.log('✅ [OrderTracking] Order loaded successfully via ID');
    } catch (err: any) {
      console.error('🔴 [OrderTracking] Fatal error:', err);
      setError(`Failed to load order details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch order by tracking token (for public access via email links)
  const fetchOrderByToken = async () => {
    try {
      console.log('🔍 [OrderTracking] Fetching order with token:', token);

      // Step 1: Try RPC function first (preferred method with rate limiting)
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_order_by_tracking_token', { p_token: token });

      console.log('📦 [OrderTracking] RPC result:', { rpcData, rpcError });

      if (rpcData && rpcData.length > 0) {
        console.log('✅ [OrderTracking] Order loaded via RPC');
        setOrder(rpcData[0]);
        
        // Fetch invoices
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('id, invoice_number, invoice_type, file_url, status')
          .eq('order_id', rpcData[0].order_id)
          .in('invoice_type', ['commercial', 'packing_list'])
          .not('file_url', 'is', null);
        
        if (invoicesData) {
          setInvoices(invoicesData);
        }
      } else if (rpcError) {
        console.warn('⚠️ [OrderTracking] RPC failed, trying direct order fetch:', rpcError);
        
        // Step 2: Fallback - Try to get order ID from tracking token directly
        const { data: tokenData } = await supabase
          .from('delivery_tracking_tokens')
          .select('order_id, expires_at')
          .eq('token', token)
          .single();

        console.log('🔑 [OrderTracking] Token lookup result:', tokenData);

        if (tokenData && new Date(tokenData.expires_at) > new Date()) {
          // Token is valid, fetch order details directly
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select(`
              id,
              order_number,
              status,
              tracking_number,
              carrier,
              estimated_delivery_date,
              actual_delivery_date,
              created_at,
              shipped_at,
              delivered_at,
              delivery_notes,
              delivery_window,
              delivery_proof_url,
              proof_of_delivery_url,
              delivery_signature,
              customer_id,
              delivery_address_id
            `)
            .eq('id', tokenData.order_id)
            .single();

          console.log('📋 [OrderTracking] Direct order fetch:', { orderData, orderError });

          if (orderData) {
            // Fetch customer and address info
            const { data: customerData } = await supabase
              .from('customers')
              .select('company_name')
              .eq('id', orderData.customer_id)
              .single();

            let deliveryAddress = 'Address not available';
            if (orderData.delivery_address_id) {
              const { data: addressData } = await supabase
                .from('customer_addresses')
                .select('*')
                .eq('id', orderData.delivery_address_id)
                .single();

              if (addressData) {
                deliveryAddress = `${addressData.street_address}, ${addressData.area ? addressData.area + ', ' : ''}${addressData.city}, ${addressData.region} - ${addressData.ghana_digital_address}`;
              }
            }

            // Format as RPC return structure
            const formattedOrder: OrderDetails = {
              order_id: orderData.id,
              order_number: orderData.order_number,
              status: orderData.status,
              tracking_number: orderData.tracking_number,
              carrier: orderData.carrier,
              estimated_delivery_date: orderData.estimated_delivery_date,
              actual_delivery_date: orderData.actual_delivery_date,
              created_at: orderData.created_at,
              shipped_at: orderData.shipped_at,
              delivered_at: orderData.delivered_at,
              delivery_notes: orderData.delivery_notes,
              delivery_window: orderData.delivery_window,
              delivery_proof_url: orderData.delivery_proof_url,
              proof_of_delivery_url: orderData.proof_of_delivery_url,
              delivery_signature: orderData.delivery_signature,
              customer_name: customerData?.company_name || 'Customer',
              delivery_address: deliveryAddress
            };

            console.log('✅ [OrderTracking] Order loaded via fallback method');
            setOrder(formattedOrder);

            // Fetch invoices
            const { data: invoicesData } = await supabase
              .from('invoices')
              .select('id, invoice_number, invoice_type, file_url, status')
              .eq('order_id', orderData.id)
              .in('invoice_type', ['commercial', 'packing_list'])
              .not('file_url', 'is', null);
            
            if (invoicesData) {
              setInvoices(invoicesData);
            }
          } else {
            console.error('❌ [OrderTracking] Order not found for token');
            setError('Order details not found. Please contact support with your tracking link.');
          }
        } else {
          console.error('❌ [OrderTracking] Token invalid or expired');
          setError('Invalid or expired tracking link. Please request a new tracking link.');
        }
      } else {
        console.error('❌ [OrderTracking] No data returned from RPC');
        setError('Invalid or expired tracking link');
      }
    } catch (err: any) {
      console.error('🔴 [OrderTracking] Fatal error:', err);
      
      // Log structured error for debugging
      await supabase.from('audit_logs').insert({
        event_type: 'tracking_page_error',
        event_data: {
          error: err.message,
          token: token?.substring(0, 10) + '...',
          timestamp: new Date().toISOString()
        },
        severity: 'high'
      });

      setError(`Failed to load order details. Error: ${err.message}. Please contact support.`);
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
    const showLoginOption = !token && orderId;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {showLoginOption ? 'Login Required' : 'Tracking Error'}
            </CardTitle>
            <CardDescription className="mt-2">
              {showLoginOption 
                ? 'Please log in to view your order details.'
                : error || 'Unable to load order information'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showLoginOption ? (
              <>
                <p className="text-sm text-muted-foreground">
                  This order page requires authentication. Please log in to your customer portal to view the full order details.
                </p>
                <div className="space-y-2">
                  <Button
                    onClick={() => window.location.href = `/portal-auth?redirect=/portal/orders/${orderId}`}
                    className="w-full"
                  >
                    Log In to Customer Portal
                  </Button>
                  <Button
                    onClick={() => window.location.href = 'mailto:support@trustlinkcompany.com?subject=Order%20Access%20Help'}
                    variant="outline"
                    className="w-full"
                  >
                    Contact Support
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  If you continue to experience issues, please contact our support team with your tracking link.
                </p>
                <Button
                  onClick={() => window.location.href = 'mailto:support@trustlinkcompany.com?subject=Tracking%20Issue'}
                  variant="outline"
                  className="w-full"
                >
                  Contact Support
                </Button>
              </>
            )}
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
                  {order.delivery_window && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Window: {order.delivery_window === 'morning' ? '9 AM - 12 PM' : 
                               order.delivery_window === 'afternoon' ? '12 PM - 5 PM' :
                               order.delivery_window === 'evening' ? '5 PM - 8 PM' : '9 AM - 8 PM'}
                    </p>
                  )}
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

        {/* Visual Order Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Order Progress</CardTitle>
            <CardDescription>Track your order through each stage</CardDescription>
          </CardHeader>
          <CardContent>
            <OrderStatusDisplay
              status={order.status}
              createdAt={order.created_at}
              shippedAt={order.shipped_at}
              deliveredAt={order.delivered_at}
              estimatedDeliveryDate={order.estimated_delivery_date}
            />
          </CardContent>
        </Card>

        {/* Invoices */}
        {invoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {invoice.invoice_type === 'commercial' ? 'Commercial Invoice' : 'Packing List'}
                      </p>
                      <p className="text-xs text-muted-foreground">{invoice.invoice_number}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => invoice.file_url && window.open(invoice.file_url, '_blank')}
                    disabled={!invoice.file_url}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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

        {/* Proof of Delivery Section */}
        {(order.status === 'delivered' || order.status === 'shipped') && (
          <ProofOfDeliverySection
            deliveryProofUrl={order.delivery_proof_url}
            proofOfDeliveryUrl={order.proof_of_delivery_url}
            deliverySignature={order.delivery_signature}
            deliveredAt={order.delivered_at}
          />
        )}

        {/* Help Section */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Questions about your order? Contact us at{' '}
              <a href="mailto:support@trustlinkcompany.com" className="text-primary hover:underline">
                support@trustlinkcompany.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderTracking;
