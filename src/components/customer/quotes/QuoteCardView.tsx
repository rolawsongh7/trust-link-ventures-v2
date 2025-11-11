import React from 'react';
import { FileText, Download, Eye, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '../StatusBadge';
import { UrgencyBadge } from './UrgencyBadge';

interface Quote {
  id: string;
  title: string;
  status: string;
  urgency: string;
  created_at: string;
  final_quote?: {
    id: string;
    quote_number: string;
    total_amount: number;
    currency: string;
    final_file_url?: string;
    status: string;
  };
}

interface QuoteCardViewProps {
  quotes: Quote[];
  onView: (quote: Quote) => void;
  onDownload: (url: string) => void;
  onApprove: (finalQuote: any) => void;
  onReject: (quoteId: string) => void;
}

export const QuoteCardView: React.FC<QuoteCardViewProps> = ({
  quotes,
  onView,
  onDownload,
  onApprove,
  onReject
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {quotes.map((quote, index) => (
        <div
          key={quote.id}
          className="group rounded-xl bg-white dark:bg-slate-900/80 shadow-md hover:shadow-xl border border-[hsl(var(--tl-border))]/40 transition-all duration-300 overflow-hidden cursor-pointer animate-fade-in-stagger"
          style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
          onClick={() => onView(quote)}
        >
          {/* Card Header */}
          <div className="p-4 border-b border-[hsl(var(--tl-border))]">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-trustlink-maritime/10 flex-shrink-0">
                  <FileText className="h-5 w-5 text-trustlink-maritime" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-trustlink-navy dark:text-white text-sm truncate">
                    {quote.title}
                  </h3>
                  <p className="text-xs text-[hsl(var(--tl-text-secondary))]">
                    #{quote.final_quote?.quote_number || quote.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <StatusBadge status={quote.status as any} variant="compact" />
            </div>
          </div>
          
          {/* Card Body */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[hsl(var(--tl-text-secondary))] flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Date:
              </span>
              <span className="font-medium text-[hsl(var(--tl-text-primary))]">
                {format(new Date(quote.created_at), 'MMM dd, yyyy')}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-[hsl(var(--tl-text-secondary))]">Urgency:</span>
              <UrgencyBadge urgency={quote.urgency} variant="compact" />
            </div>
            
            {quote.final_quote?.total_amount && (
              <div className="pt-3 border-t border-[hsl(var(--tl-border))]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--tl-text-secondary))]">Total Amount:</span>
                  <span className="text-lg font-semibold text-trustlink-maritime">
                    ${quote.final_quote.total_amount.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Card Footer - Actions */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex gap-2" onClick={(e) => e.stopPropagation()}>
            {quote.final_quote?.status === 'sent' ? (
              <>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(quote.final_quote);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                {quote.final_quote.final_file_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(quote.final_quote!.final_file_url!);
                    }}
                    className="border-trustlink-gold text-trustlink-gold hover:bg-trustlink-gold/10"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </>
            ) : quote.final_quote?.status === 'accepted' ? (
              <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--tl-success-bg))] text-[hsl(var(--tl-success-text))] text-sm font-medium">
                <CheckCircle className="h-4 w-4" />
                Accepted
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(quote);
                }}
                className="flex-1 border-trustlink-maritime text-trustlink-maritime hover:bg-trustlink-maritime/10"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
