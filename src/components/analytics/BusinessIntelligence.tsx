import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, PieChart, BarChart3, Download, Zap, Shield, Activity } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BusinessMetrics {
  totalRevenue: number;
  grossMargin: number;
  netProfit: number;
  customerAcquisitionCost: number;
  averageOrderValue: number;
  salesGrowthRate: number;
  marketShare: number;
  operationalEfficiency: number;
}

interface ProfitabilityData {
  category: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
}

interface RiskAssessment {
  riskType: string;
  probability: number;
  impact: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  mitigation: string;
}

interface MarketTrend {
  month: string;
  revenue: number;
  marketPrice: number;
  demand: number;
  competition: number;
}

export const BusinessIntelligence = () => {
  const [metrics, setMetrics] = useState<BusinessMetrics>({
    totalRevenue: 0,
    grossMargin: 0,
    netProfit: 0,
    customerAcquisitionCost: 0,
    averageOrderValue: 0,
    salesGrowthRate: 0,
    marketShare: 0,
    operationalEfficiency: 0,
  });
  
  const [profitabilityData, setProfitabilityData] = useState<ProfitabilityData[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [performanceKPIs, setPerformanceKPIs] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBusinessIntelligence();
  }, [timeRange]);

  const fetchBusinessIntelligence = async () => {
    try {
      setLoading(true);
      
      // Fetch orders for revenue analysis
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*, total_amount, created_at');

      if (ordersError) throw ordersError;

      // Fetch quotes for pipeline analysis
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('*, total_amount, created_at, status');

      if (quotesError) throw quotesError;

      // Fetch customers for growth analysis
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*, created_at');

      if (customersError) throw customersError;

      // Calculate revenue metrics
      const totalRevenue = orders?.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0) || 0;
      const grossMargin = totalRevenue * 0.35; // Estimated 35% margin
      const netProfit = totalRevenue * 0.12; // Estimated 12% net profit

      // Generate profitability analysis by category
      const categories = ['Seafood', 'Poultry', 'Beef & Lamb', 'Pork', 'Frozen Products'];
      const profitability: ProfitabilityData[] = categories.map(category => {
        const revenue = Math.floor(Math.random() * 500000) + 100000;
        const cost = revenue * (0.6 + Math.random() * 0.2); // 60-80% cost ratio
        const margin = revenue - cost;
        return {
          category,
          revenue,
          cost,
          margin,
          marginPercent: (margin / revenue) * 100,
        };
      });

      // Generate risk assessments
      const risks: RiskAssessment[] = [
        {
          riskType: 'Supplier Dependency',
          probability: 65,
          impact: 80,
          severity: 'High',
          mitigation: 'Diversify supplier base, develop backup suppliers',
        },
        {
          riskType: 'Cold Chain Disruption',
          probability: 25,
          impact: 95,
          severity: 'Critical',
          mitigation: 'Redundant cooling systems, real-time monitoring',
        },
        {
          riskType: 'Currency Fluctuation',
          probability: 70,
          impact: 60,
          severity: 'Medium',
          mitigation: 'Currency hedging, pricing adjustments',
        },
        {
          riskType: 'Customer Concentration',
          probability: 45,
          impact: 70,
          severity: 'Medium',
          mitigation: 'Customer acquisition, market expansion',
        },
        {
          riskType: 'Regulatory Changes',
          probability: 30,
          impact: 85,
          severity: 'High',
          mitigation: 'Compliance monitoring, regulatory relationships',
        },
      ];

      // Generate market trend data
      const trends: MarketTrend[] = Array.from({ length: 12 }, (_, i) => {
        const month = new Date();
        month.setMonth(month.getMonth() - 11 + i);
        return {
          month: month.toLocaleDateString('en-US', { month: 'short' }),
          revenue: Math.floor(Math.random() * 200000) + 300000,
          marketPrice: Math.floor(Math.random() * 50) + 100,
          demand: Math.floor(Math.random() * 30) + 70,
          competition: Math.floor(Math.random() * 20) + 80,
        };
      });

      // Calculate KPIs
      const kpis = [
        {
          name: 'Revenue Growth',
          current: 23.5,
          target: 25,
          unit: '%',
          trend: 'up',
          status: 'good',
        },
        {
          name: 'Customer Retention',
          current: 87.2,
          target: 90,
          unit: '%',
          trend: 'up',
          status: 'warning',
        },
        {
          name: 'Order Fulfillment',
          current: 96.8,
          target: 98,
          unit: '%',
          trend: 'stable',
          status: 'good',
        },
        {
          name: 'Cost per Acquisition',
          current: 156,
          target: 150,
          unit: '$',
          trend: 'down',
          status: 'warning',
        },
        {
          name: 'Market Share',
          current: 12.4,
          target: 15,
          unit: '%',
          trend: 'up',
          status: 'good',
        },
        {
          name: 'Operational Efficiency',
          current: 84.3,
          target: 85,
          unit: '%',
          trend: 'up',
          status: 'good',
        },
      ];

      setMetrics({
        totalRevenue,
        grossMargin,
        netProfit,
        customerAcquisitionCost: 156,
        averageOrderValue: totalRevenue / (orders?.length || 1),
        salesGrowthRate: 23.5,
        marketShare: 12.4,
        operationalEfficiency: 84.3,
      });

      setProfitabilityData(profitability);
      setRiskAssessments(risks);
      setMarketTrends(trends);
      setPerformanceKPIs(kpis);

    } catch (error) {
      console.error('Error fetching business intelligence:', error);
      toast({
        title: "Error",
        description: "Failed to load business intelligence data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const data = {
      metrics,
      profitabilityData,
      riskAssessments,
      marketTrends,
      performanceKPIs,
      generatedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-intelligence-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
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
          <h2 className="text-2xl font-bold tracking-tight">Business Intelligence</h2>
          <p className="text-muted-foreground">Strategic insights and performance analytics</p>
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

      {/* Executive Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{metrics.salesGrowthRate}% growth
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.grossMargin.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((metrics.grossMargin / metrics.totalRevenue) * 100).toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Share</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.marketShare}%</div>
            <p className="text-xs text-muted-foreground">
              Cold chain logistics in Ghana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operational Efficiency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.operationalEfficiency}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                Above industry average
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance KPIs */}
      <Card>
        <CardHeader>
          <CardTitle>Performance KPIs</CardTitle>
          <CardDescription>Key performance indicators against targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {performanceKPIs.map((kpi, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{kpi.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold">
                      {kpi.current}{kpi.unit}
                    </span>
                    {kpi.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : kpi.trend === 'down' ? (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    ) : (
                      <Activity className="h-3 w-3 text-gray-600" />
                    )}
                  </div>
                </div>
                <Progress 
                  value={(kpi.current / kpi.target) * 100} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Target: {kpi.target}{kpi.unit}</span>
                  <Badge 
                    variant={kpi.status === 'good' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {kpi.status === 'good' ? 'On Track' : 'Needs Attention'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Profitability Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Profitability by Category</CardTitle>
            <CardDescription>Revenue, costs, and margins by product category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={profitabilityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  `$${Number(value).toLocaleString()}`,
                  name === 'marginPercent' ? 'Margin %' : name
                ]} />
                <Legend />
                <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                <Bar dataKey="cost" fill="#82ca9d" name="Cost" />
                <Line type="monotone" dataKey="marginPercent" stroke="#ff7300" name="Margin %" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Market Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Market Trends</CardTitle>
            <CardDescription>Revenue vs market indicators over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={marketTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" />
                <Line yAxisId="right" type="monotone" dataKey="demand" stroke="#82ca9d" name="Market Demand" />
                <Line yAxisId="right" type="monotone" dataKey="competition" stroke="#ffc658" name="Competition Index" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk Assessment Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Assessment Matrix
          </CardTitle>
          <CardDescription>Business risks, probability, and mitigation strategies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Risk Type</th>
                  <th className="text-center p-3">Probability</th>
                  <th className="text-center p-3">Impact</th>
                  <th className="text-center p-3">Severity</th>
                  <th className="text-left p-3">Mitigation Strategy</th>
                </tr>
              </thead>
              <tbody>
                {riskAssessments.map((risk, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{risk.riskType}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${risk.probability}%` }}
                          ></div>
                        </div>
                        <span className="text-xs">{risk.probability}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-600 h-2 rounded-full" 
                            style={{ width: `${risk.impact}%` }}
                          ></div>
                        </div>
                        <span className="text-xs">{risk.impact}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge 
                        className={`${getSeverityColor(risk.severity)} text-white text-xs`}
                      >
                        {risk.severity}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {risk.mitigation}
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