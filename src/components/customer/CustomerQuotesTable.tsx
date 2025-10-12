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
import { ChevronDown, ChevronRight } from 'lucide-react';
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
  onApprove: (quoteId: string) => void;
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
            <TableHead className="text-right">Amount</TableHead>
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
                    {quote.final_quote ? (
                      <div className="font-semibold">
                        {quote.final_quote.currency} {quote.final_quote.total_amount.toLocaleString()}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
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
