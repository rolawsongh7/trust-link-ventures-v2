import React from 'react';
import { FileText, Download, Eye, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '../StatusBadge';
import { UrgencyBadge } from './UrgencyBadge';
import { cn } from '@/lib/utils';

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

interface QuoteTableViewProps {
  quotes: Quote[];
  onView: (quote: Quote) => void;
  onDownload: (url: string) => void;
  onApprove: (finalQuote: any) => void;
  onReject: (quoteId: string) => void;
}

export const QuoteTableView: React.FC<QuoteTableViewProps> = ({
  quotes,
  onView,
  onDownload,
  onApprove,
  onReject
}) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-[hsl(var(--tl-border))] shadow-sm">
      <table className="w-full">
        <thead className="bg-slate-50 dark:bg-slate-900/50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-trustlink-navy dark:text-white">
              Quote #
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-trustlink-navy dark:text-white">
              Title
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-trustlink-navy dark:text-white">
              Status
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-trustlink-navy dark:text-white">
              Urgency
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-trustlink-navy dark:text-white">
              Total Amount
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-trustlink-navy dark:text-white">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote, index) => (
            <tr
              key={quote.id}
              className={cn(
                'transition-all duration-200 hover:shadow-sm hover:-translate-y-[1px] cursor-pointer',
                index % 2 === 0 
                  ? 'bg-white dark:bg-slate-900' 
                  : 'bg-[hsl(var(--tl-bg))] dark:bg-slate-900/30'
              )}
              onClick={() => onView(quote)}
            >
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-trustlink-maritime" />
                  <span className="font-medium text-trustlink-navy dark:text-white text-sm">
                    {quote.final_quote?.quote_number || quote.id.slice(0, 8)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="max-w-xs">
                  <p className="font-medium text-[hsl(var(--tl-text-primary))] truncate text-sm">
                    {quote.title}
                  </p>
                  <p className="text-xs text-[hsl(var(--tl-text-secondary))] truncate">
                    {format(new Date(quote.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              </td>
              <td className="px-4 py-4 text-center">
                <div className="flex justify-center">
                  <StatusBadge status={quote.status as any} variant="compact" />
                </div>
              </td>
              <td className="px-4 py-4 text-center">
                <div className="flex justify-center">
                  <UrgencyBadge urgency={quote.urgency} variant="compact" />
                </div>
              </td>
              <td className="px-4 py-4 text-right">
                {quote.final_quote?.total_amount ? (
                  <span className="text-base font-semibold text-trustlink-navy dark:text-white">
                    ${quote.final_quote.total_amount.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-sm text-[hsl(var(--tl-text-secondary))]">
                    Pending
                  </span>
                )}
              </td>
              <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-center gap-2">
                  {quote.final_quote?.status === 'sent' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApprove(quote.final_quote);
                        }}
                        className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
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
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                  {quote.final_quote?.status === 'accepted' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[hsl(var(--tl-success-bg))] text-[hsl(var(--tl-success-text))]">
                      <CheckCircle className="h-3 w-3" />
                      Accepted
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(quote);
                    }}
                    className="text-trustlink-maritime hover:bg-trustlink-maritime/10"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
