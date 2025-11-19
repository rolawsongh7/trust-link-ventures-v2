import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, FileText, Users } from 'lucide-react';
import type { Order } from '@/hooks/useOrdersQuery';
import type { Quote } from '@/hooks/useQuotesQuery';
import type { Customer } from '@/hooks/useCustomersQuery';
import type { Lead } from '@/hooks/useLeadsQuery';
import { SmartMetricCard } from './SmartMetricCard';
import { AIInsightsPanel } from './AIInsightsPanel';
import { AdvancedCharts } from './AdvancedCharts';
import { AnalyticsService } from '@/lib/analytics/analyticsService';

interface AnalyticsDashboardProps {
  orders: Order[];
  quotes: Quote[];
  customers: Customer[];
  leads: Lead[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  orders,
  quotes,
  customers,
  leads,
}) => {
  const kpis = useMemo(() => {
    const totalRevenue = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length;
    const totalQuotes = quotes.length;
    const conversionRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0;

    const pendingQuotes = quotes.filter(q => q.status === 'sent').length;

    return {
      totalRevenue,
      avgOrderValue,
      conversionRate,
      pendingQuotes,
    };
  }, [orders, quotes]);

  const revenueByMonth = useMemo(() => {
    const monthlyData: Record<string, number> = {};
    
    orders.forEach(order => {
      if (order.created_at && order.status === 'delivered') {
        const month = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthlyData[month] = (monthlyData[month] || 0) + (order.total_amount || 0);
      }
    });

    return Object.entries(monthlyData).map(([month, revenue]) => ({
      month,
      revenue,
    }));
  }, [orders]);

  const ordersByStatus = useMemo(() => {
    const statusCount: Record<string, number> = {};
    
    orders.forEach(order => {
      statusCount[order.status] = (statusCount[order.status] || 0) + 1;
    });

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.replace(/_/g, ' '),
      value: count,
    }));
  }, [orders]);

  const leadConversionFunnel = useMemo(() => {
    const statusOrder = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won'];
    const statusCount: Record<string, number> = {};
    
    leads.forEach(lead => {
      statusCount[lead.status] = (statusCount[lead.status] || 0) + 1;
    });

    return statusOrder.map(status => ({
      stage: status.replace(/_/g, ' '),
      count: statusCount[status] || 0,
    }));
  }, [leads]);

  const customerSegmentation = useMemo(() => {
    const segmentCount: Record<string, number> = {};
    
    customers.forEach(customer => {
      const status = customer.customer_status || 'unknown';
      segmentCount[status] = (segmentCount[status] || 0) + 1;
    });

    return Object.entries(segmentCount).map(([segment, count]) => ({
      name: segment,
      value: count,
    }));
  }, [customers]);

  // Generate sparklines for metrics
  const revenueSparkline = AnalyticsService.generateSparklineData(orders);
  const ordersSparkline = orders.slice(-7).map(o => o.total_amount || 0);

  return (
    <div className="space-y-6">
      {/* AI Insights Panel - Top Priority */}
      <AIInsightsPanel orders={orders} quotes={quotes} customers={customers} />

      {/* Smart KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SmartMetricCard
          title="Total Revenue"
          value={kpis.totalRevenue}
          change={15.3}
          trend={revenueSparkline}
          comparison="vs last month"
          icon={DollarSign}
          sentiment="positive"
          format="currency"
        />

        <SmartMetricCard
          title="Average Order Value"
          value={kpis.avgOrderValue}
          change={8.2}
          trend={ordersSparkline}
          comparison="vs last month"
          icon={ShoppingCart}
          sentiment="positive"
          format="currency"
        />

        <SmartMetricCard
          title="Conversion Rate"
          value={kpis.conversionRate}
          change={-2.4}
          comparison="vs last month"
          icon={TrendingUp}
          sentiment="negative"
          format="percentage"
        />

        <SmartMetricCard
          title="Pending Quotes"
          value={kpis.pendingQuotes}
          comparison="requiring action"
          icon={FileText}
          sentiment="neutral"
          format="number"
        />
      </div>

      {/* Advanced Charts */}
      <AdvancedCharts orders={orders} quotes={quotes} />

      {/* Legacy Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue from delivered orders</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Distribution of order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ordersByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {ordersByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle>Lead Conversion Funnel</CardTitle>
            <CardDescription>Leads by stage in the sales funnel</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leadConversionFunnel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle>Customer Segmentation</CardTitle>
            <CardDescription>Customers by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={customerSegmentation}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="hsl(var(--secondary))"
                  dataKey="value"
                >
                  {customerSegmentation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
