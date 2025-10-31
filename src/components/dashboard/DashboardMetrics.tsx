import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InteractiveCard } from '@/components/ui/interactive-card';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, Users, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { useCounterAnimation } from '@/hooks/useCounterAnimation';

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

  const revenueCounter = useCounterAnimation({ end: metrics.monthlyRevenue, duration: 2000 });
  const quotesCounter = useCounterAnimation({ end: metrics.activeQuotes, duration: 1500 });
  const customersCounter = useCounterAnimation({ end: metrics.totalCustomers, duration: 1800 });
  const ordersCounter = useCounterAnimation({ end: metrics.pendingOrders, duration: 1600 });

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <InteractiveCard key={i} variant="glass" className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32 mb-2"></div>
              <div className="h-4 bg-muted rounded w-40"></div>
            </CardContent>
          </InteractiveCard>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <InteractiveCard 
        ref={revenueCounter.ref}
        variant="glass" 
        className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all"
      >
        <div className="absolute inset-0 bg-gradient-primary opacity-5"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Monthly Revenue</CardTitle>
          <div className="p-2 rounded-lg bg-primary/10">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {formatCurrency(parseInt(revenueCounter.count.replace(/[^0-9]/g, '')))}
          </div>
          <div className="flex items-center text-xs text-muted-foreground mt-2">
            {metrics.revenueChange >= 0 ? (
              <TrendingUp className="h-3 w-3 text-success mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive mr-1" />
            )}
            <span className={metrics.revenueChange >= 0 ? "text-success" : "text-destructive"}>
              {Math.abs(metrics.revenueChange).toFixed(1)}% from last month
            </span>
          </div>
        </CardContent>
      </InteractiveCard>

      <InteractiveCard 
        ref={quotesCounter.ref}
        variant="glass"
        className="relative overflow-hidden border-secondary/20 hover:border-secondary/40 transition-all"
      >
        <div className="absolute inset-0 bg-gradient-secondary opacity-5"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Active Quotes</CardTitle>
          <div className="p-2 rounded-lg bg-secondary/10">
            <FileText className="h-5 w-5 text-secondary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold bg-gradient-secondary bg-clip-text text-transparent">
            {quotesCounter.count}
          </div>
          <div className="flex items-center text-xs text-muted-foreground mt-2">
            <TrendingUp className="h-3 w-3 text-success mr-1" />
            <span className="text-success">+{metrics.quotesChange} new this week</span>
          </div>
        </CardContent>
      </InteractiveCard>

      <InteractiveCard 
        ref={customersCounter.ref}
        variant="glass"
        className="relative overflow-hidden border-accent/20 hover:border-accent/40 transition-all"
      >
        <div className="absolute inset-0 bg-gradient-accent opacity-5"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Total Customers</CardTitle>
          <div className="p-2 rounded-lg bg-accent/10">
            <Users className="h-5 w-5 text-accent" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold bg-gradient-accent bg-clip-text text-transparent">
            {customersCounter.count}
          </div>
          <div className="flex items-center text-xs text-muted-foreground mt-2">
            <TrendingUp className="h-3 w-3 text-success mr-1" />
            <span className="text-success">+{metrics.customersChange} new this month</span>
          </div>
        </CardContent>
      </InteractiveCard>

      <InteractiveCard 
        ref={ordersCounter.ref}
        variant="glass"
        className="relative overflow-hidden border-warning/20 hover:border-warning/40 transition-all"
      >
        <div className="absolute inset-0 bg-gradient-subtle opacity-5"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Pending Orders</CardTitle>
          <div className="p-2 rounded-lg bg-warning/10">
            <Package className="h-5 w-5 text-warning" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">
            {ordersCounter.count}
          </div>
          <div className="flex items-center text-xs text-muted-foreground mt-2">
            <TrendingUp className="h-3 w-3 text-success mr-1" />
            <span className="text-success">+{metrics.ordersChange} this week</span>
          </div>
        </CardContent>
      </InteractiveCard>
    </div>
  );
};
