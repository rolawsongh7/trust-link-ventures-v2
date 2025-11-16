import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InteractiveCard } from '@/components/ui/interactive-card';
import { Download, Eye, RefreshCw, FileText, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  total_amount: number;
  currency: string;
  status: string;
  file_url: string | null;
  created_at: string;
  orders: { order_number: string } | null;
  quotes: { quote_number: string } | null;
  customers: { company_name: string; email: string } | null;
}

interface MobileInvoiceCardProps {
  invoice: Invoice;
  onClick?: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export const MobileInvoiceCard = ({
  invoice,
  onClick,
  onPreview,
  onDownload,
  onRegenerate,
  isRegenerating
}: MobileInvoiceCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'proforma': return 'bg-blue-100 text-blue-800';
      case 'commercial': return 'bg-purple-100 text-purple-800';
      case 'credit_note': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm">{invoice.invoice_number}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(invoice.created_at), 'MMM d, yyyy')}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-lg font-bold text-foreground">
            <DollarSign className="h-4 w-4" />
            {getCurrencySymbol(invoice.currency)}{Number(invoice.total_amount).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">{invoice.currency}</div>
        </div>
      </div>

      {/* Customer */}
      {invoice.customers && (
        <div className="text-sm">
          <div className="font-medium text-foreground">{invoice.customers.company_name}</div>
          <div className="text-xs text-muted-foreground">{invoice.customers.email}</div>
        </div>
      )}

      {/* References */}
      <div className="flex gap-2 text-xs">
        {invoice.orders && (
          <Badge variant="outline" className="text-xs">
            Order: {invoice.orders.order_number}
          </Badge>
        )}
        {invoice.quotes && (
          <Badge variant="outline" className="text-xs">
            Quote: {invoice.quotes.quote_number}
          </Badge>
        )}
      </div>

      {/* Status & Type */}
      <div className="flex gap-2">
        <Badge className={`${getStatusColor(invoice.status)} text-xs px-2 py-1`}>
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </Badge>
        <Badge className={`${getTypeColor(invoice.invoice_type)} text-xs px-2 py-1`}>
          {invoice.invoice_type.replace('_', ' ').charAt(0).toUpperCase() + invoice.invoice_type.replace('_', ' ').slice(1)}
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {invoice.file_url && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
              className="flex-1"
            >
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              className="flex-1"
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRegenerate();
          }}
          disabled={isRegenerating}
          className="flex-1"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
          Regenerate
        </Button>
      </div>
    </InteractiveCard>
  );
};
