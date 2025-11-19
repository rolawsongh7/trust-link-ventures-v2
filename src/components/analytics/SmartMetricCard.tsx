import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SmartMetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  trend?: number[];
  comparison?: string;
  icon: LucideIcon;
  onClick?: () => void;
  sentiment?: 'positive' | 'negative' | 'neutral';
  format?: 'currency' | 'number' | 'percentage';
  isLoading?: boolean;
}

export const SmartMetricCard: React.FC<SmartMetricCardProps> = ({
  title,
  value,
  change,
  trend,
  comparison = 'vs last period',
  icon: Icon,
  onClick,
  sentiment = 'neutral',
  format = 'number',
  isLoading = false
}) => {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-GH', {
          style: 'currency',
          currency: 'GHS',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  const getSentimentColor = () => {
    if (change === undefined) return 'text-muted-foreground';
    if (sentiment === 'positive') return 'text-green-600 dark:text-green-400';
    if (sentiment === 'negative') return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  const getSentimentBg = () => {
    if (change === undefined) return 'bg-muted/50';
    if (sentiment === 'positive') return 'bg-green-100 dark:bg-green-900/20';
    if (sentiment === 'negative') return 'bg-red-100 dark:bg-red-900/20';
    return 'bg-muted/50';
  };

  const sparklineData = trend ? trend.map((v, i) => ({ value: v, index: i })) : [];

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className={`transition-all hover:shadow-lg ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h3 className="text-3xl font-bold tracking-tight">
                  {formatValue(value)}
                </h3>
              </motion.div>
            </div>
            <div className={`p-3 rounded-lg ${getSentimentBg()}`}>
              <Icon className={`h-5 w-5 ${getSentimentColor()}`} />
            </div>
          </div>

          {/* Trend indicator */}
          {change !== undefined && (
            <div className="flex items-center gap-2 mb-3">
              <div className={`flex items-center gap-1 text-sm font-medium ${getSentimentColor()}`}>
                {change >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{Math.abs(change).toFixed(1)}%</span>
              </div>
              <span className="text-xs text-muted-foreground">{comparison}</span>
            </div>
          )}

          {/* Sparkline */}
          {trend && trend.length > 0 && (
            <div className="h-16 -mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={change !== undefined && change >= 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'} 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
