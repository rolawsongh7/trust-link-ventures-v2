import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { Order } from '@/hooks/useOrdersQuery';
import type { Quote } from '@/hooks/useQuotesQuery';
import { AnalyticsService } from '@/lib/analytics/analyticsService';

interface AdvancedChartsProps {
  orders: Order[];
  quotes: Quote[];
}

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  success: 'hsl(var(--chart-1))',
  warning: 'hsl(var(--chart-2))',
  danger: 'hsl(var(--destructive))',
};

export const AdvancedCharts: React.FC<AdvancedChartsProps> = ({ orders, quotes }) => {
  // Revenue time series with anomaly detection
  const revenueTimeSeries = AnalyticsService.calculateRevenueTimeSeries(orders, 30);
  const revenueWithAnomalies = AnalyticsService.detectAnomalies(revenueTimeSeries);

  // Conversion funnel
  const conversionFunnel = AnalyticsService.calculateConversionFunnel(quotes, orders);

  // Profit by category (simplified)
  const profitByCategory = AnalyticsService.calculateProfitByCategory(orders);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' && entry.name.includes('Revenue') 
                ? formatCurrency(entry.value) 
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Revenue Trend with Anomaly Detection */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
          <CardDescription>Daily revenue with anomaly detection</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueWithAnomalies}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                fill="url(#colorRevenue)"
                name="Revenue"
              />
              {revenueWithAnomalies
                .filter(d => d.isAnomaly)
                .map((point, i) => (
                  <Cell key={i} fill={CHART_COLORS.danger} />
                ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Quote to order conversion rates</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversionFunnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <YAxis 
                type="category" 
                dataKey="stage" 
                width={120}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="conversion" name="Conversion %" radius={[0, 8, 8, 0]}>
                {conversionFunnel.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS.success} opacity={1 - (index * 0.15)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {conversionFunnel.map((stage, index) => (
              <div key={stage.stage} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{stage.stage}</span>
                <div className="flex gap-3">
                  <span className="font-medium">{stage.count} items</span>
                  <span className="text-primary font-semibold">{stage.conversion.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Profit by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Profitability by Category</CardTitle>
          <CardDescription>Revenue and margin breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={profitByCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(value) => formatCurrency(value)} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill={CHART_COLORS.primary} name="Revenue" radius={[8, 8, 0, 0]} />
              <Bar yAxisId="right" dataKey="margin" fill={CHART_COLORS.success} name="Margin %" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
