import { InteractiveCard } from '@/components/ui/interactive-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  currency: string;
  status: string;
  order_id: string;
  file_url: string | null;
  orders?: {
    order_number: string;
  };
}

interface MobileInvoiceCardProps {
  invoice: Invoice;
  onDownload: (invoice: Invoice) => void;
  downloading: boolean;
}

export const MobileInvoiceCard = ({ invoice, onDownload, downloading }: MobileInvoiceCardProps) => {
  const getInvoiceTypeLabel = (type: string) => {
    switch (type) {
      case 'proforma':
        return 'Proforma';
      case 'commercial':
        return 'Commercial';
      case 'packing_list':
        return 'Packing List';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      draft: { color: 'bg-muted text-muted-foreground', label: 'Draft' },
      sent: { color: 'bg-blue-100 text-blue-800', label: 'Sent' },
      paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    };
    const variant = variants[status] || variants.draft;
    
    return (
      <Badge className={`${variant.color} text-xs px-2.5 py-0.5 font-semibold`}>
        {variant.label}
      </Badge>
    );
  };

  const getInvoiceTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      proforma: 'bg-blue-50 text-blue-700 border-blue-200',
      commercial: 'bg-green-50 text-green-700 border-green-200',
      packing_list: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getInvoiceTypeBorderColor = (type: string) => {
    const colors: Record<string, string> = {
      commercial: 'border-l-green-500',
      packing_list: 'border-l-purple-500',
      proforma: 'border-l-blue-500',
    };
    return colors[type] || 'border-l-gray-300';
  };

  return (
    <InteractiveCard variant="elevated" className={`p-4 space-y-3 border-l-4 ${getInvoiceTypeBorderColor(invoice.invoice_type)}`} onClick={() => onDownload(invoice)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="font-bold text-sm truncate">{invoice.invoice_number}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={() => onDownload(invoice)}
          disabled={downloading}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Type and Status */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`${getInvoiceTypeBadge(invoice.invoice_type)} text-xs px-2.5 py-0.5 border`}>
          {getInvoiceTypeLabel(invoice.invoice_type)}
        </Badge>
        {getStatusBadge(invoice.status)}
      </div>

      {/* Amount - Prominent */}
      <div className="pt-1">
        <div className="text-2xl font-bold text-foreground">
          {invoice.currency} {Number(invoice.total_amount).toLocaleString()}
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-1 text-xs text-muted-foreground">
        {invoice.invoice_type !== 'packing_list' && (
          <div className="flex justify-between">
            <span>Issued:</span>
            <span className="font-medium text-foreground">
              {new Date(invoice.issue_date).toLocaleDateString()}
            </span>
          </div>
        )}
        {invoice.due_date && invoice.invoice_type !== 'packing_list' && (
          <div className="flex justify-between">
            <span>Due:</span>
            <span className="font-medium text-foreground">
              {new Date(invoice.due_date).toLocaleDateString()}
            </span>
          </div>
        )}
        {invoice.orders && (
          <div className="flex justify-between">
            <span>Order:</span>
            <span className="font-medium text-foreground">{invoice.orders.order_number}</span>
          </div>
        )}
      </div>
    </InteractiveCard>
  );
};
