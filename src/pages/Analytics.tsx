import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  DollarSign,
  FileText,
  Globe,
  Target,
  Calendar,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// Sample analytics data
const revenueData = [
  { month: 'Jan', revenue: 2400000, quotes: 45, conversions: 32, customers: 12 },
  { month: 'Feb', revenue: 2600000, quotes: 52, conversions: 38, customers: 15 },
  { month: 'Mar', revenue: 2200000, quotes: 38, conversions: 28, customers: 18 },
  { month: 'Apr', revenue: 2800000, quotes: 61, conversions: 45, customers: 22 },
  { month: 'May', revenue: 3200000, quotes: 58, conversions: 41, customers: 19 },
  { month: 'Jun', revenue: 2900000, quotes: 49, conversions: 36, customers: 25 },
  { month: 'Jul', revenue: 3400000, quotes: 67, conversions: 52, customers: 28 },
  { month: 'Aug', revenue: 3100000, quotes: 55, conversions: 42, customers: 24 },
];

const customerSegments = [
  { segment: 'Enterprise', value: 45, color: '#0088FE', revenue: 1800000 },
  { segment: 'Mid-Market', value: 30, color: '#00C49F', revenue: 950000 },
  { segment: 'Small Business', value: 20, color: '#FFBB28', revenue: 420000 },
  { segment: 'Startups', value: 5, color: '#FF8042', revenue: 180000 },
];

const productPerformance = [
  { product: 'Atlantic Mackerel', sales: 85, margin: 92, satisfaction: 88, inventory: 75 },
  { product: 'Premium Chicken', sales: 78, margin: 85, satisfaction: 91, inventory: 82 },
  { product: 'Black Tilapia', sales: 92, margin: 78, satisfaction: 86, inventory: 68 },
  { product: 'Beef Tenderloin', sales: 65, margin: 95, satisfaction: 94, inventory: 58 },
  { product: 'Red Snapper', sales: 73, margin: 88, satisfaction: 90, inventory: 71 },
];

const geographicData = [
  { region: 'North America', revenue: 1200000, customers: 45, growth: 12.5 },
  { region: 'Europe', revenue: 980000, customers: 38, growth: 8.3 },
  { region: 'Asia Pacific', revenue: 750000, customers: 32, growth: 18.7 },
  { region: 'Middle East', revenue: 420000, customers: 18, growth: 15.2 },
  { region: 'Africa', revenue: 380000, customers: 22, growth: 22.1 },
  { region: 'South America', revenue: 310000, customers: 15, growth: 9.8 },
];

const chartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
  quotes: { label: 'Quotes', color: 'hsl(var(--secondary))' },
  conversions: { label: 'Conversions', color: 'hsl(var(--accent))' },
  customers: { label: 'Customers', color: 'hsl(var(--muted))' },
};

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('12M');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">Business Analytics</h1>
            <p className="text-muted-foreground">Comprehensive insights into your business performance</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7D">Last 7 days</SelectItem>
                <SelectItem value="30D">Last 30 days</SelectItem>
                <SelectItem value="3M">Last 3 months</SelectItem>
                <SelectItem value="6M">Last 6 months</SelectItem>
                <SelectItem value="12M">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </motion.div>

        {/* Analytics Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="geographic">Geographic</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(22500000)}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      +15.2% vs last year
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Quote Conversion</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">74.3%</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      +3.1% vs last month
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(18500)}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                      -2.4% vs last month
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Customer LTV</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(125000)}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      +8.7% vs last quarter
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue & Performance Trends</CardTitle>
                  <CardDescription>Track key business metrics over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="revenue" orientation="left" tickFormatter={(value) => formatCurrency(value)} />
                        <YAxis yAxisId="count" orientation="right" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          yAxisId="revenue"
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                        />
                        <Line
                          yAxisId="count"
                          type="monotone"
                          dataKey="quotes"
                          stroke="hsl(var(--secondary))"
                          strokeWidth={2}
                        />
                        <Line
                          yAxisId="count"
                          type="monotone"
                          dataKey="conversions"
                          stroke="hsl(var(--accent))"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Revenue Tab */}
            <TabsContent value="revenue" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Customer Segment</CardTitle>
                    <CardDescription>Revenue distribution across customer segments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={customerSegments}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="revenue"
                            label={({ segment, percent }) => `${segment} ${(percent * 100).toFixed(0)}%`}
                          >
                            {customerSegments.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Revenue Growth</CardTitle>
                    <CardDescription>Month-over-month revenue performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(value) => formatCurrency(value)} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Performance Radar</CardTitle>
                  <CardDescription>Multi-dimensional view of top product performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={productPerformance}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="product" />
                        <PolarRadiusAxis domain={[0, 100]} />
                        <Radar
                          name="Sales"
                          dataKey="sales"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                        />
                        <Radar
                          name="Margin"
                          dataKey="margin"
                          stroke="hsl(var(--secondary))"
                          fill="hsl(var(--secondary))"
                          fillOpacity={0.3}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Geographic Tab */}
            <TabsContent value="geographic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Geographic Performance</CardTitle>
                  <CardDescription>Revenue and growth by region</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {geographicData.map((region, index) => (
                      <motion.div
                        key={region.region}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Globe className="h-6 w-6 text-primary" />
                          <div>
                            <h3 className="font-semibold">{region.region}</h3>
                            <p className="text-sm text-muted-foreground">{region.customers} customers</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(region.revenue)}</p>
                          <div className="flex items-center text-sm text-green-600">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +{formatPercentage(region.growth)}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;