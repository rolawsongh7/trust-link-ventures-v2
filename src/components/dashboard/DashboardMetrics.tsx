import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, Users, Package, TrendingUp, TrendingDown } from 'lucide-react';

interface Metrics {
  monthlyRevenue: number;
  revenueChange: number;
  activeQuotes: number;
  quotesChange: number;
  totalCustomers: number;
  customersChange: number;
  pendingOrders: number;
  ordersChange: number;
}

export const DashboardMetrics = () => {
  const [metrics, setMetrics] = useState<Metrics>({
    monthlyRevenue: 0,
    revenueChange: 0,
    activeQuotes: 0,
    quotesChange: 0,
    totalCustomers: 0,
    customersChange: 0,
    pendingOrders: 0,
    ordersChange: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get monthly revenue (from quotes accepted this month)
      const { data: thisMonthQuotes } = await supabase
        .from('quotes')
        .select('total_amount')
        .eq('status', 'accepted')
        .gte('created_at', firstDayThisMonth.toISOString());

      const { data: lastMonthQuotes } = await supabase
        .from('quotes')
        .select('total_amount')
        .gte('created_at', firstDayLastMonth.toISOString())
        .lte('created_at', lastDayLastMonth.toISOString());

      const thisMonthRevenue = thisMonthQuotes?.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0) || 0;
      const lastMonthRevenue = lastMonthQuotes?.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0) || 0;
      const revenueChange = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      // Get active quotes
      const { count: activeQuotesCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .in('status', ['draft', 'sent']);

      const { count: lastWeekQuotesCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Get total customers
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      const { count: newCustomersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayThisMonth.toISOString());

      // Get pending orders
      const { count: pendingOrdersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'quote_pending');

      const { count: lastWeekOrdersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      setMetrics({
        monthlyRevenue: thisMonthRevenue,
        revenueChange,
        activeQuotes: activeQuotesCount || 0,
        quotesChange: lastWeekQuotesCount || 0,
        totalCustomers: customersCount || 0,
        customersChange: newCustomersCount || 0,
        pendingOrders: pendingOrdersCount || 0,
        ordersChange: lastWeekOrdersCount || 0,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32 mb-2"></div>
              <div className="h-4 bg-muted rounded w-40"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.monthlyRevenue)}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {metrics.revenueChange >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            {Math.abs(metrics.revenueChange).toFixed(1)}% from last month
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Quotes</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.activeQuotes}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            +{metrics.quotesChange} new this week
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalCustomers}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            +{metrics.customersChange} new this month
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.pendingOrders}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            +{metrics.ordersChange} this week
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
