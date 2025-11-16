import { Badge } from '@/components/ui/badge';
import { InteractiveCard } from '@/components/ui/interactive-card';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface CurrencyMismatch {
  type: 'order-quote' | 'invoice-order';
  orderId?: string;
  orderNumber?: string;
  orderCurrency?: string;
  quoteId?: string;
  quoteNumber?: string;
  quoteCurrency?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceCurrency?: string;
}

interface MobileCurrencyMismatchCardProps {
  mismatch: CurrencyMismatch;
}

export const MobileCurrencyMismatchCard = ({ mismatch }: MobileCurrencyMismatchCardProps) => {
  const getCurrencyColor = (currency?: string) => {
    switch (currency) {
      case 'USD': return 'bg-green-100 text-green-800';
      case 'GHS': return 'bg-blue-100 text-blue-800';
      case 'EUR': return 'bg-purple-100 text-purple-800';
      case 'GBP': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <InteractiveCard variant="elevated" className="p-4 space-y-3 border-l-4 border-l-orange-500">
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <span className="font-bold text-sm">
          {mismatch.type === 'order-quote' ? 'Order-Quote Mismatch' : 'Invoice-Order Mismatch'}
        </span>
      </div>

      {/* Order-Quote Mismatch */}
      {mismatch.type === 'order-quote' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="font-medium">Quote {mismatch.quoteNumber}</div>
              <Badge className={`${getCurrencyColor(mismatch.quoteCurrency)} text-xs mt-1`}>
                {mismatch.quoteCurrency}
              </Badge>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="text-right">
              <div className="font-medium">Order {mismatch.orderNumber}</div>
              <Badge className={`${getCurrencyColor(mismatch.orderCurrency)} text-xs mt-1`}>
                {mismatch.orderCurrency}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Invoice-Order Mismatch */}
      {mismatch.type === 'invoice-order' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="font-medium">Order {mismatch.orderNumber}</div>
              <Badge className={`${getCurrencyColor(mismatch.orderCurrency)} text-xs mt-1`}>
                {mismatch.orderCurrency}
              </Badge>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="text-right">
              <div className="font-medium">Invoice {mismatch.invoiceNumber}</div>
              <Badge className={`${getCurrencyColor(mismatch.invoiceCurrency)} text-xs mt-1`}>
                {mismatch.invoiceCurrency}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Warning Message */}
      <div className="text-xs text-muted-foreground bg-orange-50 rounded p-2 border border-orange-200">
        Currency mismatch detected - please review and correct
      </div>
    </InteractiveCard>
  );
};
