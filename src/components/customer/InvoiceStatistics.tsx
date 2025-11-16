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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Total Invoices Card */}
      <Card className="bg-tl-surface border border-tl-border border-l-4 border-l-indigo-500 rounded-lg shadow-sm hover:shadow-md transition-all">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-tl-muted font-medium">Total Invoices</p>
              <p className="text-3xl font-bold text-tl-primary mt-1">{stats.totalCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-tl-accent/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-tl-accent" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Amount Card */}
      <Card className="bg-tl-surface border border-tl-border border-l-4 border-l-indigo-500 rounded-lg shadow-sm hover:shadow-md transition-all">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-tl-muted font-medium">Total Amount</p>
              <div className="mt-1 space-y-1">
                {Object.entries(stats.totalAmountByCurrency).length > 0 ? (
                  Object.entries(stats.totalAmountByCurrency).map(([currency, amount]) => (
                    <p key={currency} className="text-xl font-bold text-tl-primary">
                      {currency} {amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  ))
                ) : (
                  <p className="text-xl font-bold text-tl-muted">No data</p>
                )}
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-tl-gold/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-tl-gold" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unpaid Balance Card */}
      <Card
        className={`border border-l-4 border-l-indigo-500 rounded-lg shadow-sm hover:shadow-md transition-all ${
          hasUnpaid ? 'bg-[#FFF8E1] border-[#F4B400]/30' : 'bg-tl-surface border-tl-border'
        }`}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-tl-muted font-medium">Unpaid Balance</p>
              <div className="mt-1 space-y-1">
                {Object.entries(stats.unpaidByCurrency).length > 0 ? (
                  Object.entries(stats.unpaidByCurrency).map(([currency, amount]) => (
                    <p
                      key={currency}
                      className={`text-xl font-bold ${hasUnpaid ? 'text-[#F4B400]' : 'text-tl-primary'}`}
                    >
                      {currency} {amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  ))
                ) : (
                  <p className="text-xl font-bold text-tl-primary">0</p>
                )}
              </div>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                hasUnpaid ? 'bg-[#F4B400]/20' : 'bg-tl-accent/10'
              }`}
            >
              <AlertCircle className={`h-6 w-6 ${hasUnpaid ? 'text-[#F4B400]' : 'text-tl-accent'}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
