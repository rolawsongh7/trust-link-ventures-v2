import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Package, Truck, Clock, Star, AlertTriangle, CheckCircle, Download, Factory } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SupplierMetrics {
  totalSuppliers: number;
  activeSuppliers: number;
  avgDeliveryTime: number;
  onTimeDeliveryRate: number;
  qualityScore: number;
  costEfficiencyScore: number;
}

interface SupplierInsight {
  id: string;
  name: string;
  total_products: number;
  total_quotes: number;
  avg_price: number;
  performance_score: number;
  on_time_delivery: number;
  quality_rating: number;
  country: string;
  is_active: boolean;
  contact_person: string;
  last_activity: string;
}

interface SupplierPerformance {
  supplier: string;
  delivery_time: number;
  quality: number;
  cost: number;
  reliability: number;
  communication: number;
  overall: number;
}

export const SupplierAnalytics = () => {
  const [metrics, setMetrics] = useState<SupplierMetrics>({
    totalSuppliers: 0,
    activeSuppliers: 0,
    avgDeliveryTime: 0,
    onTimeDeliveryRate: 0,
    qualityScore: 0,
    costEfficiencyScore: 0,
  });
  
  const [supplierInsights, setSupplierInsights] = useState<SupplierInsight[]>([]);
  const [performanceData, setPerformanceData] = useState<SupplierPerformance[]>([]);
  const [costTrendData, setCostTrendData] = useState<any[]>([]);
  const [geographicData, setGeographicData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSupplierAnalytics();
  }, [timeRange]);

  const fetchSupplierAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch suppliers data
      const { data: suppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*');

      if (suppliersError) throw suppliersError;

      // Fetch supplier products for analysis
      const { data: supplierProducts, error: productsError } = await supabase
        .from('supplier_products')
        .select('*');

      if (productsError) throw productsError;

      // Fetch quotes for supplier performance
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('*, supplier_id, total_amount, created_at');

      if (quotesError) throw quotesError;

      // Calculate basic metrics
      const totalSuppliers = suppliers?.length || 0;
      const activeSuppliers = suppliers?.filter(s => s.is_active).length || 0;

      // Generate supplier insights with mock performance data
      const insights: SupplierInsight[] = suppliers?.map(supplier => {
        const supplierQuotes = quotes?.filter(q => q.supplier_id === supplier.id) || [];
        const supplierProductCount = supplierProducts?.filter(p => p.supplier === supplier.name).length || 0;
        const avgPrice = supplierQuotes.length > 0 
          ? supplierQuotes.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0) / supplierQuotes.length 
          : 0;

        return {
          id: supplier.id,
          name: supplier.name,
          total_products: supplierProductCount,
          total_quotes: supplierQuotes.length,
          avg_price: avgPrice,
          performance_score: Math.floor(Math.random() * 20) + 80, // Mock data
          on_time_delivery: Math.floor(Math.random() * 15) + 85, // Mock data
          quality_rating: Math.floor(Math.random() * 10) + 90, // Mock data
          country: supplier.country || 'Unknown',
          is_active: supplier.is_active,
          contact_person: supplier.contact_person || 'N/A',
          last_activity: new Date().toISOString(), // Mock data
        };
      }) || [];

      // Generate performance radar data for top suppliers
      const topSuppliers = insights.slice(0, 5);
      const performanceRadar: SupplierPerformance[] = topSuppliers.map(supplier => ({
        supplier: supplier.name.substring(0, 10) + '...',
        delivery_time: Math.floor(Math.random() * 20) + 80,
        quality: supplier.quality_rating,
        cost: Math.floor(Math.random() * 25) + 75,
        reliability: supplier.on_time_delivery,
        communication: Math.floor(Math.random() * 15) + 85,
        overall: supplier.performance_score,
      }));

      // Generate cost trend data
      const costTrend = Array.from({ length: 12 }, (_, i) => {
        const month = new Date();
        month.setMonth(month.getMonth() - 11 + i);
        return {
          month: month.toLocaleDateString('en-US', { month: 'short' }),
          avgCost: Math.floor(Math.random() * 5000) + 15000,
          marketIndex: Math.floor(Math.random() * 20) + 90,
          savingsOpportunity: Math.floor(Math.random() * 1000) + 500,
        };
      });

      // Geographic distribution
      const countryMap = new Map();
      suppliers?.forEach(supplier => {
        const country = supplier.country || 'Unknown';
        countryMap.set(country, (countryMap.get(country) || 0) + 1);
      });
      const geographic = Array.from(countryMap.entries()).map(([country, count]) => ({
        country,
        suppliers: count,
        products: supplierProducts?.filter(p => 
          suppliers?.find(s => s.name === p.supplier)?.country === country
        ).length || 0,
      }));

      setMetrics({
        totalSuppliers,
        activeSuppliers,
        avgDeliveryTime: 12.5, // Mock data
        onTimeDeliveryRate: 94.2, // Mock data
        qualityScore: 92.8, // Mock data
        costEfficiencyScore: 87.3, // Mock data
      });

      setSupplierInsights(insights);
      setPerformanceData(performanceRadar);
      setCostTrendData(costTrend);
      setGeographicData(geographic);

    } catch (error) {
      console.error('Error fetching supplier analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load supplier analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const data = {
      metrics,
      supplierInsights,
      performanceData,
      costTrendData,
      geographicData,
      generatedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <h2 className="text-2xl font-bold tracking-tight">Supplier Analytics</h2>
          <p className="text-muted-foreground">Performance insights and supplier relationship management</p>
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
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                {metrics.activeSuppliers} active
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Delivery Time</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgDeliveryTime} days</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                {metrics.onTimeDeliveryRate}% on-time
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.qualityScore}%</div>
            <p className="text-xs text-muted-foreground">
              Average quality rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.costEfficiencyScore}%</div>
            <p className="text-xs text-muted-foreground">
              Below market average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Supplier Performance Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier Performance Radar</CardTitle>
            <CardDescription>Multi-dimensional performance analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={performanceData[0] ? [performanceData[0]] : []}>
                <PolarGrid />
                <PolarAngleAxis dataKey="supplier" />
                <PolarRadiusAxis angle={0} domain={[0, 100]} />
                <Radar name="Performance" dataKey="delivery_time" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Radar name="Quality" dataKey="quality" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                <Radar name="Cost" dataKey="cost" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Trend Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Trend Analysis</CardTitle>
            <CardDescription>Average costs and market comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={costTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  name === 'avgCost' ? `$${Number(value).toLocaleString()}` : `${value}%`,
                  name === 'avgCost' ? 'Average Cost' : 'Market Index'
                ]} />
                <Legend />
                <Line type="monotone" dataKey="avgCost" stroke="#8884d8" name="Average Cost" />
                <Line type="monotone" dataKey="marketIndex" stroke="#82ca9d" name="Market Index" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Geographic Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Geographic Distribution</CardTitle>
          <CardDescription>Supplier locations and product diversity</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={geographicData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="country" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="suppliers" fill="#8884d8" name="Suppliers" />
              <Bar dataKey="products" fill="#82ca9d" name="Products" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Supplier Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Performance Dashboard</CardTitle>
          <CardDescription>Detailed performance metrics for all suppliers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Supplier</th>
                  <th className="text-left p-2">Country</th>
                  <th className="text-left p-2">Contact</th>
                  <th className="text-right p-2">Products</th>
                  <th className="text-right p-2">Quotes</th>
                  <th className="text-right p-2">Avg Price</th>
                  <th className="text-right p-2">Performance</th>
                  <th className="text-right p-2">On-Time %</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {supplierInsights.slice(0, 10).map((supplier) => (
                  <tr key={supplier.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{supplier.name}</td>
                    <td className="p-2">{supplier.country}</td>
                    <td className="p-2">{supplier.contact_person}</td>
                    <td className="p-2 text-right">{supplier.total_products}</td>
                    <td className="p-2 text-right">{supplier.total_quotes}</td>
                    <td className="p-2 text-right">
                      ${supplier.avg_price.toLocaleString()}
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-medium">{supplier.performance_score}%</span>
                        {supplier.performance_score >= 90 ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : supplier.performance_score >= 75 ? (
                          <Clock className="h-3 w-3 text-yellow-600" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-right">{supplier.on_time_delivery}%</td>
                    <td className="p-2">
                      <Badge 
                        variant={supplier.is_active ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {supplier.is_active ? 'Active' : 'Inactive'}
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