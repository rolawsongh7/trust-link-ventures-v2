import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, DollarSign, Building2, Calendar, Hash } from 'lucide-react';
import { format } from 'date-fns';

interface PaymentTransaction {
  id: string;
  ghipss_reference: string;
  amount: number;
  currency: string;
  status: string;
  payment_channel?: string;
  ghipss_transaction_id?: string;
  created_at: string;
  completed_at?: string;
  orders?: {
    order_number: string;
    customers?: {
      company_name: string;
    };
  };
}

interface MobilePaymentTransactionDetailDialogProps {
  transaction: PaymentTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobilePaymentTransactionDetailDialog = ({
  transaction,
  open,
  onOpenChange
}: MobilePaymentTransactionDetailDialogProps) => {
  if (!transaction) return null;

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Completed' };
      case 'failed':
        return { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Failed' };
      case 'pending':
        return { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Pending' };
      default:
        return { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100', label: status };
    }
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'GHS': '₵',
      'EUR': '€',
      'GBP': '£'
    };
    return symbols[currency] || currency;
  };

  const statusConfig = getStatusConfig(transaction.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Transaction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-center gap-2">
            <Badge className={`${statusConfig.bgColor} ${statusConfig.color} text-base py-2 px-4`}>
              <StatusIcon className="h-4 w-4 mr-2" />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Amount */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Amount</div>
            <div className="text-3xl font-bold">
              {getCurrencySymbol(transaction.currency)}{transaction.amount.toLocaleString()}
            </div>
          </div>

          {/* Customer */}
          {transaction.orders?.customers?.company_name && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Customer</span>
              </div>
              <div className="font-medium">{transaction.orders.customers.company_name}</div>
            </div>
          )}

          {/* References */}
          <div className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground mb-1">GHIPSS Reference</div>
              <div className="font-mono text-sm bg-muted p-2 rounded">
                {transaction.ghipss_reference}
              </div>
            </div>

            {transaction.ghipss_transaction_id && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Transaction ID</div>
                <div className="font-mono text-sm bg-muted p-2 rounded break-all">
                  {transaction.ghipss_transaction_id}
                </div>
              </div>
            )}

            {transaction.orders?.order_number && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Order Number</div>
                <div className="font-medium">{transaction.orders.order_number}</div>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-4">
            {transaction.payment_channel && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Payment Channel</div>
                <Badge variant="outline">{transaction.payment_channel}</Badge>
              </div>
            )}

            <div>
              <div className="text-sm text-muted-foreground mb-1">Currency</div>
              <Badge variant="outline">{transaction.currency}</Badge>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="text-sm font-medium">
                  {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
            </div>

            {transaction.completed_at && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">Completed</div>
                  <div className="text-sm font-medium">
                    {format(new Date(transaction.completed_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
