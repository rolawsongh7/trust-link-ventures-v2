import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Globe, Loader2 } from 'lucide-react';

interface CurrencyData {
  currency: string;
  total_quotes: number;
  total_orders: number;
  total_revenue: number;
  average_value: number;
  conversion_rate: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const CurrencyAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [currencyData, setCurrencyData] = useState<CurrencyData[]>([]);

  useEffect(() => {
    fetchCurrencyAnalytics();
  }, [dateRange]);

  const fetchCurrencyAnalytics = async () => {
    try {
      setLoading(true);
      const days = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch quotes by currency
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('currency, total_amount, status')
        .gte('created_at', startDate.toISOString());

      if (quotesError) throw quotesError;

      // Fetch orders by currency
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('currency, total_amount')
        .gte('created_at', startDate.toISOString());

      if (ordersError) throw ordersError;

      // Process data by currency
      const currencyStats: { [key: string]: CurrencyData } = {};

      quotes?.forEach(quote => {
        const currency = quote.currency || 'USD';
        if (!currencyStats[currency]) {
          currencyStats[currency] = {
            currency,
            total_quotes: 0,
            total_orders: 0,
            total_revenue: 0,
            average_value: 0,
            conversion_rate: 0
          };
        }
        currencyStats[currency].total_quotes += 1;
        currencyStats[currency].total_revenue += quote.total_amount || 0;
      });

      orders?.forEach(order => {
        const currency = order.currency || 'USD';
        if (currencyStats[currency]) {
          currencyStats[currency].total_orders += 1;
        }
      });

      // Calculate averages and conversion rates
      const result = Object.values(currencyStats).map(stat => ({
        ...stat,
        average_value: stat.total_quotes > 0 ? stat.total_revenue / stat.total_quotes : 0,
        conversion_rate: stat.total_quotes > 0 ? (stat.total_orders / stat.total_quotes) * 100 : 0
      }));

      setCurrencyData(result);
    } catch (error) {
      console.error('Error fetching currency analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = currencyData.reduce((sum, item) => sum + item.total_revenue, 0);
  const topCurrency = currencyData.length > 0 
    ? currencyData.reduce((prev, current) => prev.total_revenue > current.total_revenue ? prev : current)
    : null;

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
          <h2 className="text-3xl font-bold">Currency Analytics</h2>
          <p className="text-muted-foreground">Multi-currency quote and order analysis</p>
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Currencies</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyData.length}</div>
            <p className="text-xs text-muted-foreground">Active currencies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Currency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topCurrency?.currency || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {topCurrency?.total_quotes || 0} quotes, {topCurrency?.total_orders || 0} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all currencies</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Currency</CardTitle>
            <CardDescription>Total quote value per currency</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={currencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="currency" />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="total_revenue" fill="#8884d8" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Currency Distribution</CardTitle>
            <CardDescription>Quote count by currency</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={currencyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ currency, total_quotes }) => `${currency}: ${total_quotes}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total_quotes"
                >
                  {currencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Currency Table */}
      <Card>
        <CardHeader>
          <CardTitle>Currency Performance</CardTitle>
          <CardDescription>Detailed breakdown by currency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currencyData.map((data, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-3">
                <div className="space-y-1">
                  <p className="font-semibold text-lg">{data.currency}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Quotes: {data.total_quotes}</span>
                    <span>Orders: {data.total_orders}</span>
                    <span>Rate: {data.conversion_rate.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">
                    {data.currency} {data.total_revenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Avg: {data.currency} {data.average_value.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CurrencyAnalytics;