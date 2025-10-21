import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, ChevronRight, Check, X, Download } from 'lucide-react';
import { ExpandedQuoteRow } from './ExpandedQuoteRow';

interface QuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  preferred_grade?: string;
  specifications?: string;
}

interface FinalQuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

interface FinalQuote {
  id: string;
  quote_number: string;
  status: string;
  total_amount: number;
  currency: string;
  final_quote_items?: FinalQuoteItem[];
  file_url?: string;
  valid_until?: string;
  final_file_url?: string;
}

interface Quote {
  id: string;
  title: string;
  message?: string;
  status: string;
  urgency: string;
  created_at: string;
  updated_at: string;
  quote_request_items?: QuoteItem[];
  final_quote?: FinalQuote;
}

interface CustomerQuotesTableProps {
  quotes: Quote[];
  onApprove: (finalQuote: FinalQuote) => void;
  onReject: (quoteId: string) => void;
  onDownload: (url: string) => void;
}

export function CustomerQuotesTable({ quotes, onApprove, onReject, onDownload }: CustomerQuotesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (quoteId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(quoteId)) {
      newExpanded.delete(quoteId);
    } else {
      newExpanded.add(quoteId);
    }
    setExpandedRows(newExpanded);
  };

  const getPriceDisplay = (finalQuote: FinalQuote | undefined): string => {
    if (!finalQuote) {
      return '-';
    }

    if (!finalQuote.final_quote_items || finalQuote.final_quote_items.length === 0) {
      return '-';
    }

    const validPrices = finalQuote.final_quote_items
      .filter(item => {
        if (item.unit_price == null || isNaN(item.unit_price)) return false;
        if (item.unit_price < 0) return false;
        return true;
      })
      .map(item => item.unit_price);

    if (validPrices.length === 0) {
      return '-';
    }

    const currency = finalQuote.currency || 'USD';
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);

    if (minPrice === maxPrice) {
      return `${currency} ${minPrice.toLocaleString()}/unit`;
    }

    return `${currency} ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}/unit`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return colors[status.toLowerCase() as keyof typeof colors] || colors.pending;
  };

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return colors[urgency.toLowerCase() as keyof typeof colors] || colors.medium;
  };

  if (quotes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No quote requests found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Quote #</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead className="text-right" aria-label="Unit price range for quoted items">Unit Price</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => {
            const isExpanded = expandedRows.has(quote.id);
            return (
              <>
                <TableRow
                  key={quote.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleRow(quote.id)}
                >
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono font-semibold text-primary">
                      {quote.final_quote?.quote_number || 'Pending'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{quote.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {quote.quote_request_items?.length || 0} item(s)
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(quote.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(quote.status)}>
                      {quote.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getUrgencyColor(quote.urgency)} variant="outline">
                      {quote.urgency}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {quote.final_quote && quote.final_quote.final_quote_items && quote.final_quote.final_quote_items.length > 0 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="font-medium text-sm cursor-help">
                              {getPriceDisplay(quote.final_quote)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              {quote.final_quote.final_quote_items.length === 1 
                                ? 'Unit price for this item' 
                                : `Price range across ${quote.final_quote.final_quote_items.length} items. Click to view details.`}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {quote.final_quote ? (
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-lg">
                          {quote.final_quote.currency} {quote.final_quote.total_amount.toLocaleString()}
                        </span>
                        {quote.final_quote.valid_until && (
                          <span className="text-xs text-muted-foreground">
                            Valid until {new Date(quote.final_quote.valid_until).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    {quote.final_quote && quote.status === 'quoted' && (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApprove(quote.final_quote);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReject(quote.final_quote.id);
                          }}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        {quote.final_quote?.final_file_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownload(quote.final_quote.final_file_url);
                            }}
                            title="Download quote PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                    {quote.final_quote && quote.status === 'approved' && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        ✓ Accepted
                      </Badge>
                    )}
                    {quote.final_quote && quote.status === 'rejected' && (
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        ✗ Rejected
                      </Badge>
                    )}
                    {!quote.final_quote && (
                      <span className="text-xs text-muted-foreground">Awaiting quote</span>
                    )}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={9} className="p-0">
                      <ExpandedQuoteRow
                        quote={quote}
                        onApprove={onApprove}
                        onReject={onReject}
                        onDownload={onDownload}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
