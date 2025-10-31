import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';

export interface InvoiceStats {
  totalCount: number;
  totalAmountByCurrency: Record<string, number>;
  unpaidByCurrency: Record<string, number>;
  averageValue: number;
}

interface InvoiceStatisticsProps {
  stats: InvoiceStats;
  loading?: boolean;
}

export const InvoiceStatistics = ({ stats, loading }: InvoiceStatisticsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrencyAmounts = (amounts: Record<string, number>) => {
    const entries = Object.entries(amounts);
    if (entries.length === 0) return 'No data';
    
    return entries.map(([currency, amount]) => (
      <div key={currency} className="text-2xl font-bold">
        {currency} {amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </div>
    ));
  };

  const hasUnpaid = Object.values(stats.unpaidByCurrency).some(amount => amount > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Invoices Card */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Total Invoices
              </p>
              <div className="text-2xl font-bold text-foreground">
                {stats.totalCount}
              </div>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Amount Card */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Total Amount
              </p>
              <div className="text-foreground">
                {formatCurrencyAmounts(stats.totalAmountByCurrency)}
              </div>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unpaid Balance Card */}
      <Card className={`hover:shadow-md transition-shadow ${hasUnpaid ? 'border-yellow-500/50' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Unpaid Balance
              </p>
              <div className={hasUnpaid ? 'text-yellow-600' : 'text-foreground'}>
                {formatCurrencyAmounts(stats.unpaidByCurrency)}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${hasUnpaid ? 'bg-yellow-500/10' : 'bg-muted'}`}>
              <AlertCircle className={`h-6 w-6 ${hasUnpaid ? 'text-yellow-600' : 'text-muted-foreground'}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
