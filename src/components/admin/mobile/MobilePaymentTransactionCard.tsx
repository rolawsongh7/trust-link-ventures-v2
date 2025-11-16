import { Badge } from '@/components/ui/badge';
import { InteractiveCard } from '@/components/ui/interactive-card';
import { CheckCircle, XCircle, Clock, DollarSign, Calendar, Building } from 'lucide-react';

interface PaymentTransaction {
  id: string;
  ghipss_reference: string;
  ghipss_transaction_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_channel: string;
  created_at: string;
  completed_at: string;
  orders: {
    order_number: string;
    customers: {
      company_name: string;
      email: string;
    };
  };
}

interface MobilePaymentTransactionCardProps {
  transaction: PaymentTransaction;
  onClick?: () => void;
}

export const MobilePaymentTransactionCard = ({ transaction, onClick }: MobilePaymentTransactionCardProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle,
          color: 'bg-green-100 text-green-800',
          label: 'Success'
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'bg-red-100 text-red-800',
          label: 'Failed'
        };
      default:
        return {
          icon: Clock,
          color: 'bg-yellow-100 text-yellow-800',
          label: 'Pending'
        };
    }
  };

  const statusConfig = getStatusConfig(transaction.status);
  const StatusIcon = statusConfig.icon;

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'GHS': '₵'
    };
    return symbols[currency] || currency;
  };

  return (
    <InteractiveCard variant="elevated" className="p-4 space-y-3" onClick={onClick}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground font-mono">
            {transaction.ghipss_reference}
          </div>
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">
              {transaction.orders?.customers?.company_name || 'Unknown Customer'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-lg font-bold text-foreground">
            <DollarSign className="h-4 w-4" />
            {getCurrencySymbol(transaction.currency)}{Number(transaction.amount).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Order Reference */}
      {transaction.orders && (
        <div className="text-sm">
          <Badge variant="outline" className="text-xs">
            Order: {transaction.orders.order_number}
          </Badge>
        </div>
      )}

      {/* Payment Details */}
      <div className="space-y-2 text-sm">
        {transaction.payment_channel && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Channel:</span>
            <span className="font-medium text-xs">{transaction.payment_channel}</span>
          </div>
        )}
        {transaction.ghipss_transaction_id && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Transaction ID:</span>
            <span className="font-mono text-xs">{transaction.ghipss_transaction_id}</span>
          </div>
        )}
      </div>

      {/* Status & Date */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Badge className={`${statusConfig.color} text-xs px-2 py-1 flex items-center gap-1`}>
          <StatusIcon className="h-3 w-3" />
          {statusConfig.label}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(transaction.completed_at || transaction.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      </div>
    </InteractiveCard>
  );
};
