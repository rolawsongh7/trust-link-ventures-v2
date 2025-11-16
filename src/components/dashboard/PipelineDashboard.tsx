import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { FileText, DollarSign, Package, Truck, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PipelineStats {
  quotes: {
    draft: number;
    sent: number;
    accepted: number;
    totalValue: number;
  };
  payment: {
    pending: number;
    received: number;
    totalPending: number;
  };
  fulfillment: {
    processing: number;
    readyToShip: number;
  };
  delivery: {
    shipped: number;
    delivered: number;
    needsAddress: number;
  };
}

export const PipelineDashboard: React.FC = () => {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPipelineStats = async () => {
    try {
      const [quotesData, ordersData] = await Promise.all([
        supabase.from('quotes').select('status, total_amount, currency'),
        supabase.from('orders').select('status, total_amount, delivery_address_id'),
      ]);

      const quotes = quotesData.data || [];
      const orders = ordersData.data || [];

      const pipelineStats: PipelineStats = {
        quotes: {
          draft: quotes.filter(q => q.status === 'draft').length,
          sent: quotes.filter(q => q.status === 'sent').length,
          accepted: quotes.filter(q => q.status === 'accepted').length,
          totalValue: quotes
            .filter(q => q.status === 'sent')
            .reduce((sum, q) => sum + Number(q.total_amount || 0), 0),
        },
        payment: {
          pending: orders.filter(o => o.status === 'pending_payment').length,
          received: orders.filter(o => o.status === 'payment_received').length,
          totalPending: orders
            .filter(o => o.status === 'pending_payment')
            .reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
        },
        fulfillment: {
          processing: orders.filter(o => o.status === 'processing').length,
          readyToShip: orders.filter(o => o.status === 'ready_to_ship').length,
        },
        delivery: {
          shipped: orders.filter(o => o.status === 'shipped').length,
          delivered: orders.filter(o => o.status === 'delivered').length,
          needsAddress: orders.filter(
            o => ['processing', 'ready_to_ship'].includes(o.status) && !o.delivery_address_id
          ).length,
        },
      };

      setStats(pipelineStats);
    } catch (error) {
      console.error('Error fetching pipeline stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineStats();

    // Real-time updates
    const quotesChannel = supabase
      .channel('pipeline-quotes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, fetchPipelineStats)
      .subscribe();

    const ordersChannel = supabase
      .channel('pipeline-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchPipelineStats)
      .subscribe();

    return () => {
      supabase.removeChannel(quotesChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stats && stats.delivery.needsAddress > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            {stats.delivery.needsAddress} order(s) need delivery address before they can be shipped
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Quotes Pipeline */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quotes Pipeline</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.quotes.sent || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active quotes worth ${stats?.quotes.totalValue.toLocaleString() || 0}
            </p>
            <div className="mt-3 flex gap-2">
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                {stats?.quotes.draft || 0} Draft
              </Badge>
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                {stats?.quotes.accepted || 0} Accepted
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payment Pipeline */}
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.payment.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              Pending ${stats?.payment.totalPending.toLocaleString() || 0}
            </p>
            <div className="mt-3">
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                {stats?.payment.received || 0} Received
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Fulfillment Pipeline */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fulfillment</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.fulfillment.processing || 0}</div>
            <p className="text-xs text-muted-foreground">Currently processing</p>
            <div className="mt-3">
              <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
                {stats?.fulfillment.readyToShip || 0} Ready to Ship
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Pipeline */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.delivery.shipped || 0}</div>
            <p className="text-xs text-muted-foreground">Currently in transit</p>
            <div className="mt-3 flex gap-2">
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                {stats?.delivery.delivered || 0} Delivered
              </Badge>
              {stats && stats.delivery.needsAddress > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.delivery.needsAddress} No Address
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
