import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import AnalyticsReports from '@/components/AnalyticsReports';
import { CustomerAnalytics } from '@/components/analytics/CustomerAnalytics';
import { BusinessIntelligence } from '@/components/analytics/BusinessIntelligence';
import { Users, TrendingUp, BarChart3, Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AnalyticsPage = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [overviewMetrics, setOverviewMetrics] = useState({
    activeCustomers: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    totalOrders: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchOverviewMetrics();
  }, [refreshKey]);

  const fetchOverviewMetrics = async () => {
    try {
      const [customersRes, ordersRes] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('orders').select('total_amount'),
      ]);

      const activeCustomers = customersRes.data?.filter(c => c.customer_status === 'active').length || 0;
      const totalRevenue = ordersRes.data?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;
      const totalOrders = ordersRes.data?.length || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setOverviewMetrics({
        activeCustomers,
        totalRevenue,
        avgOrderValue,
        totalOrders,
      });
    } catch (error) {
      console.error('Error fetching overview metrics:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive insights into customers, suppliers, and business performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          </div>
        </div>

        {/* Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customer Analytics
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Business Intelligence
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewMetrics.activeCustomers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently active status
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${overviewMetrics.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    All orders to date
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${overviewMetrics.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  <p className="text-xs text-muted-foreground">
                    Per order average
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewMetrics.totalOrders.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    All time
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <AnalyticsReports key={refreshKey} />
          </TabsContent>

          <TabsContent value="customers">
            <CustomerAnalytics key={refreshKey} />
          </TabsContent>

          <TabsContent value="business">
            <BusinessIntelligence key={refreshKey} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AnalyticsPage;