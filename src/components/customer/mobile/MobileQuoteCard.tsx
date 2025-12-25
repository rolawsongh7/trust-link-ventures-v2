import { useState } from 'react';
import { InteractiveCard } from '@/components/ui/interactive-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, Clock, Package, ChevronDown, ChevronUp, Download, Eye, Check, X, AlertCircle } from 'lucide-react';
import { QuoteStatusBadge } from '../QuoteStatusBadge';
import { UrgencyBadge } from '../quotes/UrgencyBadge';

interface QuoteItem {
  id: string;
  product_name: string;
  product_description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  specifications?: string;
}

interface Quote {
  id: string;
  title: string;
  message?: string;
  status: string;
  urgency: string;
  created_at: string;
  updated_at: string;
  quote_request_items?: any[];
  final_quote?: {
    id: string;
    quote_number: string;
    status: string;
    total_amount: number;
    currency: string;
    valid_until?: string;
    final_file_url?: string;
    sent_at?: string;
    customer_email?: string;
    quote_items?: QuoteItem[];
  };
}

interface MobileQuoteCardProps {
  quote: Quote;
  onApprove: (finalQuote: any) => void;
  onReject: (quoteId: string) => void;
  onDownload: (url: string, quoteNumber: string) => void;
  onViewPDF: (quote: Quote) => void;
}

export const MobileQuoteCard = ({ 
  quote, 
  onApprove, 
  onReject, 
  onDownload,
  onViewPDF 
}: MobileQuoteCardProps) => {
  const [showItems, setShowItems] = useState(false);

  const hasFinalQuote = quote.final_quote &&
    quote.final_quote.status === 'sent' && 
    quote.final_quote.total_amount > 0 &&
    quote.final_quote.final_file_url;
  const items = quote.final_quote?.quote_items || quote.quote_request_items || [];
  const itemCount = items.length;

  return (
    <InteractiveCard variant="elevated" className="p-4 space-y-3">
      {/* Final Quote Available Banner */}
      {hasFinalQuote && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-xs text-blue-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="font-semibold">Final Quote Available</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
            {quote.final_quote ? (
              <span className="font-bold text-sm">{quote.final_quote.quote_number}</span>
            ) : (
              <span className="font-bold text-sm truncate">{quote.title}</span>
            )}
          </div>
          {!quote.final_quote && (
            <p className="text-xs text-muted-foreground line-clamp-1">{quote.title}</p>
          )}
        </div>
        {quote.final_quote && (
          <Badge className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 border">
            {quote.final_quote.currency}
          </Badge>
        )}
      </div>

      {/* Status and Date */}
      <div className="flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <QuoteStatusBadge status={quote.status} variant="compact" showTooltip={false} />
          <UrgencyBadge urgency={quote.urgency} variant="compact" />
        </div>
        <div className="text-muted-foreground">
          {new Date(quote.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Items - Collapsible */}
      {itemCount > 0 && (
        <div className="border-t pt-3">
          <button
            onClick={() => setShowItems(!showItems)}
            className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Items ({itemCount})</span>
            {showItems ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          {showItems && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {items.slice(0, 3).map((item: any, idx: number) => (
                <li key={idx} className="flex justify-between">
                  <span className="truncate mr-2">• {item.product_name}</span>
                  <span className="whitespace-nowrap">{item.quantity} {item.unit}</span>
                </li>
              ))}
              {itemCount > 3 && (
                <li className="text-primary">+{itemCount - 3} more items</li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Total Amount */}
      {quote.final_quote && (
        <div className="border-t pt-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Total Amount:</span>
            <span className="text-xl font-bold text-foreground">
              {quote.final_quote.currency} {Number(quote.final_quote.total_amount).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {hasFinalQuote && quote.final_quote?.final_file_url && (
        <div className="space-y-2 pt-2">
          {quote.final_quote.status === 'sent' && (
            <div className="flex gap-2">
              <Button 
                onClick={() => onApprove(quote.final_quote)}
                size="sm" 
                className="flex-1 h-9"
              >
                <Check className="h-3 w-3 mr-1" />
                <span className="text-xs">Accept</span>
              </Button>
              <Button 
                onClick={() => onReject(quote.final_quote!.id)}
                variant="outline" 
                size="sm" 
                className="flex-1 h-9"
              >
                <X className="h-3 w-3 mr-1" />
                <span className="text-xs">Reject</span>
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Button 
              onClick={() => onViewPDF(quote)}
              variant="outline" 
              size="sm" 
              className="flex-1 h-9"
            >
              <Eye className="h-3 w-3 mr-1" />
              <span className="text-xs">View PDF</span>
            </Button>
            <Button 
              onClick={() => onDownload(quote.final_quote!.final_file_url!, quote.final_quote!.quote_number)}
              variant="outline" 
              size="sm" 
              className="flex-1 h-9"
            >
              <Download className="h-3 w-3 mr-1" />
              <span className="text-xs">Download</span>
            </Button>
          </div>
        </div>
      )}
    </InteractiveCard>
  );
};
