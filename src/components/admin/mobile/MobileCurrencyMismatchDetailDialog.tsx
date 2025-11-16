import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowRight, FileText, ShoppingCart, DollarSign } from 'lucide-react';

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

interface MobileCurrencyMismatchDetailDialogProps {
  mismatch: CurrencyMismatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileCurrencyMismatchDetailDialog = ({
  mismatch,
  open,
  onOpenChange
}: MobileCurrencyMismatchDetailDialogProps) => {
  if (!mismatch) return null;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Currency Mismatch Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mismatch Type */}
          <div>
            <div className="text-sm text-muted-foreground mb-2">Mismatch Type</div>
            <Badge variant="outline" className="border-orange-500 text-orange-700">
              {mismatch.type === 'order-quote' ? 'Order-Quote Mismatch' : 'Invoice-Order Mismatch'}
            </Badge>
          </div>

          {/* Order-Quote Mismatch Details */}
          {mismatch.type === 'order-quote' && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Quote</span>
                </div>
                <div className="text-sm text-muted-foreground mb-1">Number</div>
                <div className="font-medium mb-2">{mismatch.quoteNumber}</div>
                <div className="text-sm text-muted-foreground mb-1">Currency</div>
                <Badge className={getCurrencyColor(mismatch.quoteCurrency)}>
                  {mismatch.quoteCurrency}
                </Badge>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="h-6 w-6 text-orange-500" />
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Order</span>
                </div>
                <div className="text-sm text-muted-foreground mb-1">Number</div>
                <div className="font-medium mb-2">{mismatch.orderNumber}</div>
                <div className="text-sm text-muted-foreground mb-1">Currency</div>
                <Badge className={getCurrencyColor(mismatch.orderCurrency)}>
                  {mismatch.orderCurrency}
                </Badge>
              </div>
            </div>
          )}

          {/* Invoice-Order Mismatch Details */}
          {mismatch.type === 'invoice-order' && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Order</span>
                </div>
                <div className="text-sm text-muted-foreground mb-1">Number</div>
                <div className="font-medium mb-2">{mismatch.orderNumber}</div>
                <div className="text-sm text-muted-foreground mb-1">Currency</div>
                <Badge className={getCurrencyColor(mismatch.orderCurrency)}>
                  {mismatch.orderCurrency}
                </Badge>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="h-6 w-6 text-orange-500" />
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Invoice</span>
                </div>
                <div className="text-sm text-muted-foreground mb-1">Number</div>
                <div className="font-medium mb-2">{mismatch.invoiceNumber}</div>
                <div className="text-sm text-muted-foreground mb-1">Currency</div>
                <Badge className={getCurrencyColor(mismatch.invoiceCurrency)}>
                  {mismatch.invoiceCurrency}
                </Badge>
              </div>
            </div>
          )}

          {/* Warning Message */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              <strong>Action Required:</strong> Currency mismatch detected between related documents. 
              Please review and correct to ensure data consistency.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
