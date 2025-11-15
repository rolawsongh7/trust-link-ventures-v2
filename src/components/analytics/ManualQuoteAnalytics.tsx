import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, FileText, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface AnalyticsMetrics {
  totalQuotes: number;
  convertedQuotes: number;
  conversionRate: number;
  averageQuoteValue: number;
  averageTimeToConversion: number;
  totalRevenue: number;
  previousPeriodComparison: {
    quotes: number;
    conversion: number;
    revenue: number;
  };
}

interface MonthlyTrend {
  month: string;
  created: number;
  converted: number;
  rejected: number;
}

interface ConfirmationMethodData {
  name: string;
  value: number;
}

interface TopProduct {
  product_name: string;
  times_quoted: number;
  times_ordered: number;
  conversion_rate: number;
  total_revenue: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ManualQuoteAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [confirmationMethods, setConfirmationMethods] = useState<ConfirmationMethodData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const days = parseInt(dateRange);
      const startDate = subDays(new Date(), days);

      // Fetch key metrics
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .eq('origin_type', 'manual')
        .gte('created_at', startDate.toISOString());

      if (quotesError) throw quotesError;

      const totalQuotes = quotes?.length || 0;
      const convertedQuotes = quotes?.filter(q => q.status === 'converted').length || 0;
      const conversionRate = totalQuotes > 0 ? (convertedQuotes / totalQuotes) * 100 : 0;

      // Calculate average quote value
      const totalValue = quotes?.reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0;
      const averageQuoteValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;

      // Calculate average time to conversion
      const convertedWithTime = quotes?.filter(q => q.status === 'converted' && q.converted_at) || [];
      const totalDays = convertedWithTime.reduce((sum, q) => {
        const created = new Date(q.created_at);
        const converted = new Date(q.converted_at);
        return sum + Math.floor((converted.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      const averageTimeToConversion = convertedWithTime.length > 0 ? totalDays / convertedWithTime.length : 0;

      // Fetch converted orders for revenue
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount')
        .in('quote_id', convertedQuotes > 0 ? quotes.filter(q => q.status === 'converted').map(q => q.id) : []);

      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      // Previous period comparison
      const previousStartDate = subDays(startDate, days);
      const { data: previousQuotes } = await supabase
        .from('quotes')
        .select('*')
        .eq('origin_type', 'manual')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      const prevTotal = previousQuotes?.length || 0;
      const prevConverted = previousQuotes?.filter(q => q.status === 'converted').length || 0;
      const prevConversionRate = prevTotal > 0 ? (prevConverted / prevTotal) * 100 : 0;

      setMetrics({
        totalQuotes,
        convertedQuotes,
        conversionRate,
        averageQuoteValue,
        averageTimeToConversion,
        totalRevenue,
        previousPeriodComparison: {
          quotes: prevTotal > 0 ? ((totalQuotes - prevTotal) / prevTotal) * 100 : 0,
          conversion: prevConversionRate > 0 ? conversionRate - prevConversionRate : 0,
          revenue: 0 // Would need previous period revenue calculation
        }
      });

      // Build monthly trends from quote data
      const trendsByMonth: { [key: string]: MonthlyTrend } = {};
      quotes?.forEach(q => {
        const month = format(new Date(q.created_at), 'MMM yyyy');
        if (!trendsByMonth[month]) {
          trendsByMonth[month] = { month, created: 0, converted: 0, rejected: 0 };
        }
        trendsByMonth[month].created += 1;
        if (q.status === 'converted') trendsByMonth[month].converted += 1;
        if (q.status === 'rejected') trendsByMonth[month].rejected += 1;
      });
      setMonthlyTrends(Object.values(trendsByMonth));

      // Fetch confirmation methods distribution from orders
      const convertedQuoteIds = quotes?.filter(q => q.status === 'converted').map(q => q.id) || [];
      
      if (convertedQuoteIds.length > 0) {
        const { data: methodsData } = await supabase
          .from('orders')
          .select('manual_confirmation_method')
          .in('quote_id', convertedQuoteIds)
          .not('manual_confirmation_method', 'is', null);

        const methodCounts: { [key: string]: number } = {};
        methodsData?.forEach(item => {
          const method = item.manual_confirmation_method || 'Other';
          methodCounts[method] = (methodCounts[method] || 0) + 1;
        });

        setConfirmationMethods(
          Object.entries(methodCounts).map(([name, value]) => ({ name, value }))
        );
      } else {
        setConfirmationMethods([]);
      }

      // Fetch top products
      const { data: productsData } = await supabase
        .from('quote_items')
        .select(`
          product_name,
          total_price,
          quotes!inner(id, status, origin_type, created_at)
        `)
        .eq('quotes.origin_type', 'manual')
        .gte('quotes.created_at', startDate.toISOString());

      // Process top products
      const productStats: { [key: string]: TopProduct } = {};
      productsData?.forEach((item: any) => {
        const name = item.product_name;
        if (!productStats[name]) {
          productStats[name] = {
            product_name: name,
            times_quoted: 0,
            times_ordered: 0,
            conversion_rate: 0,
            total_revenue: 0
          };
        }
        productStats[name].times_quoted += 1;
        if (item.quotes.status === 'converted') {
          productStats[name].times_ordered += 1;
          productStats[name].total_revenue += item.total_price || 0;
        }
      });

      const topProductsArray = Object.values(productStats).map(p => ({
        ...p,
        conversion_rate: p.times_quoted > 0 ? (p.times_ordered / p.times_quoted) * 100 : 0
      })).sort((a, b) => b.times_quoted - a.times_quoted).slice(0, 10);

      setTopProducts(topProductsArray);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Manual Quote Analytics</h2>
          <p className="text-muted-foreground">Track performance of manually created quotes</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalQuotes || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {metrics && metrics.previousPeriodComparison.quotes > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{metrics.previousPeriodComparison.quotes.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">{metrics?.previousPeriodComparison.quotes.toFixed(1)}%</span>
                </>
              )}
              from previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.convertedQuotes} of {metrics?.totalQuotes} quotes converted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Quote Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics?.averageQuoteValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Per quote</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time to Convert</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.averageTimeToConversion.toFixed(1) || 0} days</div>
            <p className="text-xs text-muted-foreground">From creation to order</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>Quote creation and conversion over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#8884d8" name="Created" />
                <Line type="monotone" dataKey="converted" stroke="#82ca9d" name="Converted" />
                <Line type="monotone" dataKey="rejected" stroke="#ff8042" name="Rejected" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confirmation Methods</CardTitle>
            <CardDescription>How quotes were confirmed</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={confirmationMethods}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {confirmationMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
          <CardDescription>Most frequently quoted products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-3">
                <div className="space-y-1">
                  <p className="font-medium">{product.product_name}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Quoted: {product.times_quoted}x</span>
                    <span>Ordered: {product.times_ordered}x</span>
                    <span>Rate: {product.conversion_rate.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${product.total_revenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualQuoteAnalytics;