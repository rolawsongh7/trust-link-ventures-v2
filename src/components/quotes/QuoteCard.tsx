import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, FileText, Send, CheckCircle, XCircle, Eye } from 'lucide-react';
import type { Quote } from '@/hooks/useQuotesQuery';

interface QuoteCardProps {
  quote: Quote & { customers?: { company_name: string } };
  onView?: (quote: Quote) => void;
  onEdit?: (quote: Quote) => void;
  onSend?: (quote: Quote) => void;
  onApprove?: (quote: Quote) => void;
  onReject?: (quote: Quote) => void;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    sent: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    accepted: 'bg-green-500/10 text-green-600 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
  };
  return colors[status] || 'bg-muted';
};

export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  onView,
  onEdit,
  onSend,
  onApprove,
  onReject,
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{quote.quote_number}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {quote.customers?.company_name || quote.customer_email || 'No customer'}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(quote)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(quote)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onSend && quote.status === 'draft' && (
                <DropdownMenuItem onClick={() => onSend(quote)}>
                  <Send className="h-4 w-4 mr-2" />
                  Send to Customer
                </DropdownMenuItem>
              )}
              {onApprove && quote.status === 'sent' && (
                <DropdownMenuItem onClick={() => onApprove(quote)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </DropdownMenuItem>
              )}
              {onReject && quote.status === 'sent' && (
                <DropdownMenuItem onClick={() => onReject(quote)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="font-semibold">
              {quote.currency || 'USD'} {quote.total_amount?.toLocaleString() || '0'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge className={getStatusColor(quote.status)}>
              {quote.status}
            </Badge>
          </div>

          {quote.title && (
            <div className="pt-2 border-t">
              <p className="text-sm line-clamp-2">{quote.title}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
