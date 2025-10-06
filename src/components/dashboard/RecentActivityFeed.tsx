import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, Package, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'quote' | 'customer' | 'order' | 'alert';
  title: string;
  time: string;
  status: string;
}

export const RecentActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const fetchRecentActivities = async () => {
    try {
      const activities: Activity[] = [];

      // Fetch recent quotes
      const { data: quotes } = await supabase
        .from('quotes')
        .select('id, quote_number, status, created_at, customers(company_name)')
        .order('created_at', { ascending: false })
        .limit(3);

      quotes?.forEach((quote) => {
        activities.push({
          id: quote.id,
          type: 'quote',
          title: `Quote ${quote.quote_number} ${quote.status === 'sent' ? 'sent to' : 'created for'} ${(quote.customers as any)?.company_name || 'customer'}`,
          time: quote.created_at,
          status: quote.status,
        });
      });

      // Fetch recent customers
      const { data: customers } = await supabase
        .from('customers')
        .select('id, company_name, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      customers?.forEach((customer) => {
        activities.push({
          id: customer.id,
          type: 'customer',
          title: `New customer registered: ${customer.company_name}`,
          time: customer.created_at,
          status: 'completed',
        });
      });

      // Fetch recent orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      orders?.forEach((order) => {
        activities.push({
          id: order.id,
          type: 'order',
          title: `Order ${order.order_number} ${order.status}`,
          time: order.created_at,
          status: order.status,
        });
      });

      // Sort by time and limit to 8 most recent
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivities(activities.slice(0, 8));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quote': return <FileText className="h-4 w-4" />;
      case 'customer': return <Users className="h-4 w-4" />;
      case 'order': return <Package className="h-4 w-4" />;
      case 'alert': return <AlertCircle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'sent':
      case 'processing':
        return <Badge variant="outline" className="flex items-center gap-1">In Progress</Badge>;
      case 'accepted':
      case 'completed':
      case 'delivered':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Completed</Badge>;
      case 'rejected':
      case 'cancelled':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your business operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 animate-pulse">
                <div className="h-4 w-4 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-6 w-20 bg-muted rounded"></div>
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
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest updates from your business operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {getStatusBadge(activity.status)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
