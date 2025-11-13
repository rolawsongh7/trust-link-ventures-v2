import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, FileText, Users, Package } from 'lucide-react';

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

  const [animatedRevenue, setAnimatedRevenue] = useState(0);
  const [animatedQuotes, setAnimatedQuotes] = useState(0);
  const [animatedCustomers, setAnimatedCustomers] = useState(0);
  const [animatedOrders, setAnimatedOrders] = useState(0);

  useEffect(() => {
    if (!loading) {
      animateValue(setAnimatedRevenue, metrics.monthlyRevenue, 2000);
      animateValue(setAnimatedQuotes, metrics.activeQuotes, 1500);
      animateValue(setAnimatedCustomers, metrics.totalCustomers, 1800);
      animateValue(setAnimatedOrders, metrics.pendingOrders, 1600);
    }
  }, [loading, metrics]);

  const animateValue = (setter: React.Dispatch<React.SetStateAction<number>>, end: number, duration: number) => {
    let start = 0;
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setter(end);
        clearInterval(timer);
      } else {
        setter(Math.floor(current));
      }
    }, 16);
  };

  return (
    <>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 bg-[#E2E8F0] rounded w-1/2"></div>
                <div className="h-10 w-10 bg-gradient-to-br from-[#3B82F6]/20 to-[#0EA5E9]/20 rounded-full"></div>
              </div>
              <div className="h-8 bg-[#E2E8F0] rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-[#E2E8F0] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="group bg-white/90 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-white/20 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[#64748B]">Monthly Revenue</h3>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#0EA5E9] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#0F172A] mb-2">
              {formatCurrency(animatedRevenue)}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {metrics.revenueChange >= 0 ? (
                <span className="text-green-600 font-semibold">↗ +{metrics.revenueChange.toFixed(1)}%</span>
              ) : (
                <span className="text-red-600 font-semibold">↘ {metrics.revenueChange.toFixed(1)}%</span>
              )}
              <span className="text-[#94A3B8]">from last month</span>
            </div>
          </div>

          <div className="group bg-white/90 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-white/20 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[#64748B]">Active Quotes</h3>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#0F172A] mb-2">
              {animatedQuotes}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {metrics.quotesChange >= 0 ? (
                <span className="text-green-600 font-semibold">↗ +{metrics.quotesChange}</span>
              ) : (
                <span className="text-red-600 font-semibold">↘ {metrics.quotesChange}</span>
              )}
              <span className="text-[#94A3B8]">from yesterday</span>
            </div>
          </div>

          <div className="group bg-white/90 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-white/20 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[#64748B]">Total Customers</h3>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#0F172A] mb-2">
              {animatedCustomers}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {metrics.customersChange >= 0 ? (
                <span className="text-green-600 font-semibold">↗ +{metrics.customersChange}</span>
              ) : (
                <span className="text-red-600 font-semibold">↘ {metrics.customersChange}</span>
              )}
              <span className="text-[#94A3B8]">new this month</span>
            </div>
          </div>

          <div className="group bg-white/90 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-white/20 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[#64748B]">Pending Orders</h3>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#0F172A] mb-2">
              {animatedOrders}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {metrics.ordersChange >= 0 ? (
                <span className="text-green-600 font-semibold">↗ +{metrics.ordersChange}</span>
              ) : (
                <span className="text-red-600 font-semibold">↘ {metrics.ordersChange}</span>
              )}
              <span className="text-[#94A3B8]">from yesterday</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
