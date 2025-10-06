import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, XCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface PendingItem {
  id: string;
  type: 'quote' | 'order';
  number: string;
  customer: string;
  amount: number;
  created_at: string;
}

export const PendingApprovals = () => {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      // Fetch quotes pending approval (sent status)
      const { data: quotes } = await supabase
        .from('quotes')
        .select('id, quote_number, total_amount, created_at, customers(company_name)')
        .eq('status', 'sent')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch orders pending approval
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, created_at, customers(company_name)')
        .eq('status', 'quote_pending')
        .order('created_at', { ascending: false })
        .limit(5);

      const items: PendingItem[] = [];

      quotes?.forEach((quote) => {
        items.push({
          id: quote.id,
          type: 'quote',
          number: quote.quote_number,
          customer: (quote.customers as any)?.company_name || 'Unknown',
          amount: Number(quote.total_amount) || 0,
          created_at: quote.created_at,
        });
      });

      orders?.forEach((order) => {
        items.push({
          id: order.id,
          type: 'order',
          number: order.order_number,
          customer: (order.customers as any)?.company_name || 'Unknown',
          amount: Number(order.total_amount) || 0,
          created_at: order.created_at,
        });
      });

      // Sort by date
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPendingItems(items.slice(0, 5));
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item: PendingItem) => {
    try {
      if (item.type === 'quote') {
        const { error } = await supabase
          .from('quotes')
          .update({ status: 'accepted', approved_at: new Date().toISOString() })
          .eq('id', item.id);

        if (error) throw error;
        toast.success('Quote approved successfully');
      } else {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'processing' })
          .eq('id', item.id);

        if (error) throw error;
        toast.success('Order approved successfully');
      }
      fetchPendingApprovals();
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (item: PendingItem) => {
    try {
      if (item.type === 'quote') {
        const { error } = await supabase
          .from('quotes')
          .update({ status: 'rejected' })
          .eq('id', item.id);

        if (error) throw error;
        toast.success('Quote rejected');
      } else {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', item.id);

        if (error) throw error;
        toast.success('Order cancelled');
      }
      fetchPendingApprovals();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Items requiring your attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border bg-muted/50 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals</CardTitle>
        <CardDescription>Items requiring your attention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No pending approvals</p>
          ) : (
            pendingItems.map((item) => (
              <div key={item.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">
                        {item.type === 'quote' ? 'Quote' : 'Order'} {item.number}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.customer}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{formatCurrency(item.amount)}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(item.type === 'quote' ? '/quotes' : '/orders')}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1"
                    onClick={() => handleApprove(item)}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleReject(item)}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
