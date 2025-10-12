import { Package, Calendar, Clock, AlertCircle, CheckCircle, XCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

interface ExpandedQuoteRowProps {
  quote: Quote;
  onApprove: (quoteId: string) => void;
  onReject: (quoteId: string) => void;
  onDownload: (url: string) => void;
}

export function ExpandedQuoteRow({ quote, onApprove, onReject, onDownload }: ExpandedQuoteRowProps) {
  const getUrgencyColor = (urgency: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return colors[urgency.toLowerCase() as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="bg-muted/30 p-6 space-y-6 border-t-2 border-primary/20 animate-in slide-in-from-top-2">
      {/* Quick Info Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
          <Package className="h-5 w-5 text-primary" />
          <div>
            <div className="text-xs text-muted-foreground">Items</div>
            <div className="font-semibold">{quote.quote_request_items?.length || 0}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <div className="text-xs text-muted-foreground">Created</div>
            <div className="font-semibold">{new Date(quote.created_at).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <div className="text-xs text-muted-foreground">Updated</div>
            <div className="font-semibold">{new Date(quote.updated_at).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
          <AlertCircle className="h-5 w-5 text-primary" />
          <div>
            <div className="text-xs text-muted-foreground">Urgency</div>
            <Badge className={getUrgencyColor(quote.urgency)} variant="outline">
              {quote.urgency}
            </Badge>
          </div>
        </div>
      </div>

      {/* Message */}
      {quote.message && (
        <div className="bg-background rounded-lg border p-4">
          <h4 className="font-semibold mb-2">Your Message</h4>
          <p className="text-sm text-muted-foreground">{quote.message}</p>
        </div>
      )}

      {/* Requested Items Table */}
      {quote.quote_request_items && quote.quote_request_items.length > 0 && (
        <div className="bg-background rounded-lg border overflow-hidden">
          <div className="p-4 border-b">
            <h4 className="font-semibold">Requested Items</h4>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Specifications</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.quote_request_items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell>{item.quantity} {item.unit}</TableCell>
                  <TableCell>{item.preferred_grade || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.specifications || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Final Quote Section */}
      {quote.final_quote && (
        <div className="bg-gradient-to-br from-primary/10 to-transparent rounded-lg border border-primary/20 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Final Quote - {quote.final_quote.quote_number}</h4>
            <Badge variant={quote.final_quote.status === 'sent' ? 'default' : 'secondary'}>
              {quote.final_quote.status}
            </Badge>
          </div>

          {/* Final Quote Items */}
          {quote.final_quote.final_quote_items && quote.final_quote.final_quote_items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.final_quote.final_quote_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>{item.quantity} {item.unit}</TableCell>
                    <TableCell className="text-right">
                      {quote.final_quote!.currency} {item.unit_price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {quote.final_quote!.currency} {item.total_price.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold">Total Amount:</TableCell>
                  <TableCell className="text-right font-bold text-lg text-primary">
                    {quote.final_quote.currency} {quote.final_quote.total_amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {quote.final_quote.file_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(quote.final_quote!.file_url!)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
            {quote.final_quote.status === 'sent' && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onApprove(quote.final_quote!.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Quote
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onReject(quote.final_quote!.id)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Quote
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Payment Instructions for Approved Quotes */}
      {quote.final_quote?.status === 'accepted' && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">
            Payment Instructions
          </h4>
          <p className="text-sm text-green-700 dark:text-green-400">
            Thank you for approving this quote. Our sales team will contact you with payment instructions shortly.
          </p>
        </div>
      )}
    </div>
  );
}
