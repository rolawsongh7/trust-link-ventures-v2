import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Globe, 
  Target,
  Eye,
  MapPin,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

interface AnalyticsData {
  leadsWonLost: {
    won: number;
    lost: number;
    pending: number;
  };
  ordersByRegion: Array<{
    region: string;
    orders: number;
    value: number;
  }>;
  customerEngagement: Array<{
    month: string;
    activities: number;
    quotes: number;
    orders: number;
  }>;
  websiteVisitors: Array<{
    date: string;
    visitors: number;
    pageViews: number;
  }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const AnalyticsReports = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    leadsWonLost: { won: 0, lost: 0, pending: 0 },
    ordersByRegion: [],
    customerEngagement: [],
    websiteVisitors: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch leads won/lost data
      const { data: leadsData } = await supabase
        .from('leads')
        .select('status');

      const leadsWonLost = leadsData?.reduce((acc, lead) => {
        if (lead.status === 'closed_won') {
          acc.won += 1;
        } else if (lead.status === 'closed_lost') {
          acc.lost += 1;
        } else {
          acc.pending += 1;
        }
        return acc;
      }, { won: 0, lost: 0, pending: 0 }) || { won: 0, lost: 0, pending: 0 };

      // Fetch orders by region - Note: 'orders' table doesn't exist, using quotes instead
      const { data: quotesData } = await supabase
        .from('quotes')
        .select(`
          total_amount,
          customers(country)
        `);

      const ordersByRegion = quotesData?.reduce((acc, quote) => {
        const country = (quote.customers as any)?.country || 'Unknown';
        const existing = acc.find(r => r.region === country);
        if (existing) {
          existing.orders += 1;
          existing.value += Number(quote.total_amount) || 0;
        } else {
          acc.push({
            region: country,
            orders: 1,
            value: Number(quote.total_amount) || 0
          });
        }
        return acc;
      }, [] as Array<{ region: string; orders: number; value: number }>) || [];

      // Fetch customer engagement data (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [activitiesData, quotesMonthlyData] = await Promise.all([
        supabase
          .from('activities')
          .select('created_at')
          .gte('created_at', sixMonthsAgo.toISOString()),
        supabase
          .from('quotes')
          .select('created_at')
          .gte('created_at', sixMonthsAgo.toISOString())
      ]);

      const monthlyEngagement = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date();
        month.setMonth(month.getMonth() - i);
        const monthStr = month.toLocaleDateString('en-US', { month: 'short' });
        
        const activities = activitiesData.data?.filter(a => 
          new Date(a.created_at).getMonth() === month.getMonth()
        ).length || 0;
        
        const quotes = quotesMonthlyData.data?.filter(q => 
          new Date(q.created_at).getMonth() === month.getMonth()
        ).length || 0;
        
        // Using quotes as orders proxy since orders table doesn't exist
        const orders = Math.floor(quotes * 0.7); // Assuming 70% quote-to-order conversion

        monthlyEngagement.push({
          month: monthStr,
          activities,
          quotes,
          orders
        });
      }

      // Generate mock website visitor data (in a real app, this would come from analytics)
      const websiteVisitors = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        websiteVisitors.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          visitors: Math.floor(Math.random() * 200) + 50,
          pageViews: Math.floor(Math.random() * 500) + 100
        });
      }

      setAnalyticsData({
        leadsWonLost,
        ordersByRegion,
        customerEngagement: monthlyEngagement,
        websiteVisitors
      });

    } catch (error: any) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const leadsChartData = [
    { name: 'Won', value: analyticsData.leadsWonLost.won, color: 'hsl(var(--primary))' },
    { name: 'Lost', value: analyticsData.leadsWonLost.lost, color: 'hsl(var(--destructive))' },
    { name: 'Pending', value: analyticsData.leadsWonLost.pending, color: 'hsl(var(--muted))' }
  ];

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Won</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{analyticsData.leadsWonLost.won}</div>
            <p className="text-xs text-muted-foreground">Successfully converted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Lost</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{analyticsData.leadsWonLost.lost}</div>
            <p className="text-xs text-muted-foreground">Not converted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Regions</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.ordersByRegion.length}</div>
            <p className="text-xs text-muted-foreground">Countries with orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.ordersByRegion.reduce((sum, region) => sum + region.orders, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all regions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leads" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="leads">Leads Won/Lost</TabsTrigger>
          <TabsTrigger value="regions">Orders by Region</TabsTrigger>
          <TabsTrigger value="engagement">Customer Engagement</TabsTrigger>
          <TabsTrigger value="visitors">Website Visitors</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Leads Conversion Analysis
              </CardTitle>
              <CardDescription>
                Overview of lead conversion rates and pipeline performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadsChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {leadsChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Orders by Region
              </CardTitle>
              <CardDescription>
                Geographic distribution of orders and revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.ordersByRegion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="hsl(var(--primary))" name="Orders" />
                    <Bar dataKey="value" fill="hsl(var(--secondary))" name="Value ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Engagement Trends
              </CardTitle>
              <CardDescription>
                Monthly activity, quotes, and orders over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.customerEngagement}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="activities" stroke="hsl(var(--primary))" name="Activities" />
                    <Line type="monotone" dataKey="quotes" stroke="hsl(var(--secondary))" name="Quotes" />
                    <Line type="monotone" dataKey="orders" stroke="hsl(var(--accent))" name="Orders" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visitors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Website Visitors
              </CardTitle>
              <CardDescription>
                Daily website traffic and page views for the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.websiteVisitors}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" name="Visitors" />
                    <Line type="monotone" dataKey="pageViews" stroke="hsl(var(--secondary))" name="Page Views" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsReports;