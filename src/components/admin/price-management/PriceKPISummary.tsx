import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Package, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';

interface PriceKPISummaryProps {
  totalProducts: number;
  pricedProducts: number;
  unpricedProducts: number;
  avgMargin: number;
}

export const PriceKPISummary: React.FC<PriceKPISummaryProps> = ({
  totalProducts,
  pricedProducts,
  unpricedProducts,
  avgMargin
}) => {
  const coveragePercent = totalProducts > 0 ? ((pricedProducts / totalProducts) * 100).toFixed(1) : '0';

  const kpis = [
    {
      label: 'Total Products',
      value: totalProducts.toLocaleString(),
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Priced Products',
      value: pricedProducts.toLocaleString(),
      subtext: `${coveragePercent}% coverage`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Missing Prices',
      value: unpricedProducts.toLocaleString(),
      subtext: unpricedProducts > 0 ? 'Needs attention' : 'All set!',
      icon: AlertCircle,
      color: unpricedProducts > 0 ? 'text-yellow-600' : 'text-green-600',
      bgColor: unpricedProducts > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Avg. Margin',
      value: avgMargin ? `${avgMargin.toFixed(1)}%` : 'N/A',
      subtext: avgMargin > 20 ? 'Healthy' : avgMargin > 10 ? 'Moderate' : 'Low',
      icon: TrendingUp,
      color: avgMargin > 20 ? 'text-green-600' : avgMargin > 10 ? 'text-yellow-600' : 'text-red-600',
      bgColor: avgMargin > 20 ? 'bg-green-100 dark:bg-green-900/30' : avgMargin > 10 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
                {kpi.subtext && (
                  <p className={`text-xs ${kpi.color}`}>{kpi.subtext}</p>
                )}
              </div>
              <div className={`p-3 rounded-full ${kpi.bgColor}`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
