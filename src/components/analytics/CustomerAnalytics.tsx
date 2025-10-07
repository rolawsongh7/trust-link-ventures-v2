import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, TrendingUp, TrendingDown, Users, MapPin, Package, DollarSign, Activity, Download } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomerMetrics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  averageOrderValue: number;
  customerLifetimeValue: number;
  retentionRate: number;
  churnRate: number;
}

interface CustomerInsight {
  id: string;
  company_name: string;
  total_orders: number;
  total_revenue: number;
  last_order_date: string;
  country: string;
  industry: string;
  customer_status: string;
  priority: string;
}

export const CustomerAnalytics = () => {
  const [metrics, setMetrics] = useState<CustomerMetrics>({
    totalCustomers: 0,
    activeCustomers: 0,
    newCustomers: 0,
    averageOrderValue: 0,
    customerLifetimeValue: 0,
    retentionRate: 0,
    churnRate: 0,
  });
  
  const [customerInsights, setCustomerInsights] = useState<CustomerInsight[]>([]);
  const [geographicData, setGeographicData] = useState<any[]>([]);
  const [industryData, setIndustryData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomerAnalytics();
  }, [timeRange]);

  const fetchCustomerAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch basic customer metrics
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*');

      if (customersError) throw customersError;

      // Fetch orders data for revenue analysis
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*, customer_id, total_amount, created_at');

      if (ordersError) throw ordersError;

      // Calculate metrics
      const totalCustomers = customers?.length || 0;
      const activeCustomers = customers?.filter(c => c.customer_status === 'active').length || 0;
      
      // Calculate date ranges
      const now = new Date();
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      
      const newCustomers = customers?.filter(c => 
        new Date(c.created_at) > cutoffDate
      ).length || 0;

      const recentOrders = orders?.filter(o => 
        new Date(o.created_at) > cutoffDate
      ) || [];

      const totalRevenue = recentOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
      const averageOrderValue = recentOrders.length > 0 ? totalRevenue / recentOrders.length : 0;

      // Create customer insights with revenue data
      const customerRevenueMap = new Map();
      recentOrders.forEach(order => {
        const customerId = order.customer_id;
        const amount = Number(order.total_amount) || 0;
        customerRevenueMap.set(customerId, (customerRevenueMap.get(customerId) || 0) + amount);
      });

      const insights = customers?.map(customer => ({
        id: customer.id,
        company_name: customer.company_name,
        total_orders: recentOrders.filter(o => o.customer_id === customer.id).length,
        total_revenue: customerRevenueMap.get(customer.id) || 0,
        last_order_date: recentOrders
          .filter(o => o.customer_id === customer.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at || null,
        country: customer.country,
        industry: customer.industry,
        customer_status: customer.customer_status,
        priority: customer.priority,
      })).sort((a, b) => b.total_revenue - a.total_revenue) || [];

      // Geographic distribution
      const countryMap = new Map();
      customers?.forEach(customer => {
        const country = customer.country || 'Unknown';
        countryMap.set(country, (countryMap.get(country) || 0) + 1);
      });
      const geographic = Array.from(countryMap.entries()).map(([country, count]) => ({
        country,
        customers: count,
        revenue: insights.filter(c => c.country === country).reduce((sum, c) => sum + c.total_revenue, 0)
      }));

      // Industry distribution
      const industryMap = new Map();
      customers?.forEach(customer => {
        const industry = customer.industry || 'Unknown';
        industryMap.set(industry, (industryMap.get(industry) || 0) + 1);
      });
      const industry = Array.from(industryMap.entries()).map(([industry, count]) => ({
        industry,
        customers: count,
        revenue: insights.filter(c => c.industry === industry).reduce((sum, c) => sum + c.total_revenue, 0)
      }));

      // Revenue trend data (actual data from orders)
      const revenueTrend = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
        const dayOrders = recentOrders.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate.toDateString() === date.toDateString();
        });
        const dayRevenue = dayOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayRevenue,
          orders: dayOrders.length,
        };
      });

      setMetrics({
        totalCustomers,
        activeCustomers,
        newCustomers,
        averageOrderValue,
        customerLifetimeValue: averageOrderValue * 5, // Estimated
        retentionRate: 85, // Sample
        churnRate: 15, // Sample
      });

      setCustomerInsights(insights);
      setGeographicData(geographic);
      setIndustryData(industry);
      setRevenueData(revenueTrend);

    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load customer analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const data = {
      metrics,
      customerInsights,
      geographicData,
      industryData,
      generatedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customer Analytics</h2>
          <p className="text-muted-foreground">Insights into customer behavior and revenue patterns</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{metrics.newCustomers} new this period
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((metrics.activeCustomers / metrics.totalCustomers) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.averageOrderValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Per order in {timeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.retentionRate}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600 flex items-center">
                <TrendingDown className="h-3 w-3 mr-1" />
                {metrics.churnRate}% churn rate
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Daily revenue and order volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  name === 'revenue' ? `$${Number(value).toLocaleString()}` : value,
                  name === 'revenue' ? 'Revenue' : 'Orders'
                ]} />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>Customers by country</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={geographicData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ country, customers }) => `${country}: ${customers}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="customers"
                >
                  {geographicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Industry Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Industry Analysis</CardTitle>
          <CardDescription>Customer distribution and revenue by industry</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={industryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="industry" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="customers" fill="#8884d8" name="Customers" />
              <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue ($)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
          <CardDescription>Highest revenue customers in selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Company</th>
                  <th className="text-left p-2">Country</th>
                  <th className="text-left p-2">Industry</th>
                  <th className="text-right p-2">Orders</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Priority</th>
                </tr>
              </thead>
              <tbody>
                {customerInsights.slice(0, 10).map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{customer.company_name}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {customer.country || 'N/A'}
                      </div>
                    </td>
                    <td className="p-2">{customer.industry || 'N/A'}</td>
                    <td className="p-2 text-right">{customer.total_orders}</td>
                    <td className="p-2 text-right font-medium">
                      ${customer.total_revenue.toLocaleString()}
                    </td>
                    <td className="p-2">
                      <Badge 
                        variant={customer.customer_status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {customer.customer_status}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Badge 
                        variant={customer.priority === 'high' ? 'destructive' : customer.priority === 'medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {customer.priority}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};