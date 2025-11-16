import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, FileText, Download, Eye, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  total_amount: number;
  currency: string;
  status: string;
  issue_date?: string;
  due_date?: string;
  file_url?: string | null;
  created_at: string;
  orders?: { order_number: string }[] | { order_number: string } | null;
  quotes?: { quote_number: string }[] | { quote_number: string } | null;
  customers?: { company_name: string } | null;
}

interface MobileInvoiceDetailDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPreview?: (invoice: Invoice) => void;
  onDownload?: (invoice: Invoice) => void;
  onRegenerate?: (invoiceId: string) => void;
  isRegenerating?: boolean;
}

export const MobileInvoiceDetailDialog = ({
  invoice,
  open,
  onOpenChange,
  onPreview,
  onDownload,
  onRegenerate,
  isRegenerating = false
}: MobileInvoiceDetailDialogProps) => {
  if (!invoice) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'proforma': return 'bg-blue-100 text-blue-800';
      case 'commercial': return 'bg-purple-100 text-purple-800';
      case 'tax': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status and Type */}
          <div className="flex gap-2">
            <Badge className={getStatusColor(invoice.status)}>
              {invoice.status}
            </Badge>
            <Badge className={getTypeColor(invoice.invoice_type)}>
              {invoice.invoice_type}
            </Badge>
          </div>

          {/* Amount */}
          <div className="flex items-center gap-2 text-2xl font-bold">
            <DollarSign className="h-6 w-6 text-muted-foreground" />
            {getCurrencySymbol(invoice.currency)}{invoice.total_amount.toLocaleString()}
          </div>

          {/* Customer */}
          {invoice.customers?.company_name && (
            <div>
              <div className="text-sm text-muted-foreground">Customer</div>
              <div className="font-medium">{invoice.customers.company_name}</div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            {invoice.issue_date && (
              <div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Issue Date
                </div>
                <div className="font-medium">
                  {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
                </div>
              </div>
            )}
            {invoice.due_date && (
              <div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due Date
                </div>
                <div className="font-medium">
                  {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                </div>
              </div>
            )}
          </div>

          {/* Order/Quote Reference */}
          {(Array.isArray(invoice.orders) ? invoice.orders[0] : invoice.orders) && (
            <div>
              <div className="text-sm text-muted-foreground">Order Number</div>
              <div className="font-medium">
                {(Array.isArray(invoice.orders) ? invoice.orders[0] : invoice.orders)?.order_number}
              </div>
            </div>
          )}
          {(Array.isArray(invoice.quotes) ? invoice.quotes[0] : invoice.quotes) && (
            <div>
              <div className="text-sm text-muted-foreground">Quote Number</div>
              <div className="font-medium">
                {(Array.isArray(invoice.quotes) ? invoice.quotes[0] : invoice.quotes)?.quote_number}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-4">
            {onPreview && (
              <Button variant="outline" onClick={() => onPreview(invoice)} className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Preview PDF
              </Button>
            )}
            {onDownload && invoice.file_url && (
              <Button variant="outline" onClick={() => onDownload(invoice)} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
            {onRegenerate && (
              <Button 
                variant="outline" 
                onClick={() => onRegenerate(invoice.id)} 
                disabled={isRegenerating}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Regenerating...' : 'Regenerate PDF'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
