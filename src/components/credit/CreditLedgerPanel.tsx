// Credit Ledger Panel Component
// Phase 5.2: Admin view of customer credit usage history

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  FileText, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { useCustomerCreditLedger, useCustomerCreditTerms } from '@/hooks/useCustomerCreditTerms';
import { formatCreditAmount, getAvailableCredit, getCreditUtilization } from '@/utils/creditHelpers';
import { format, differenceInDays, isPast } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CreditLedgerPanelProps {
  customerId: string;
  customerName?: string;
}

interface LedgerEntry {
  order_id: string;
  order_number: string;
  customer_id: string;
  total_amount: number;
  credit_amount_used: number;
  credit_due_date: string;
  payment_status: string;
  order_date: string;
  is_overdue: boolean;
  credit_limit: number;
  current_balance: number;
  net_terms: string;
}

export function CreditLedgerPanel({ customerId, customerName }: CreditLedgerPanelProps) {
  const { data: ledger, isLoading, refetch } = useCustomerCreditLedger(customerId);
  const { data: creditTerms } = useCustomerCreditTerms(customerId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const entries = (ledger as LedgerEntry[]) || [];
  
  // Calculate summary stats
  const totalOutstanding = entries
    .filter(e => e.payment_status !== 'fully_paid' && e.payment_status !== 'overpaid')
    .reduce((sum, e) => sum + (e.credit_amount_used || 0), 0);
  
  const overdueAmount = entries
    .filter(e => e.is_overdue)
    .reduce((sum, e) => sum + (e.credit_amount_used || 0), 0);

  const overdueCount = entries.filter(e => e.is_overdue).length;

  const available = creditTerms 
    ? getAvailableCredit(creditTerms.credit_limit, creditTerms.current_balance) 
    : 0;

  const utilization = creditTerms 
    ? getCreditUtilization(creditTerms.current_balance, creditTerms.credit_limit) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Credit Ledger
            </CardTitle>
            <CardDescription>
              Credit usage history for {customerName || 'this customer'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Outstanding
            </div>
            <p className="text-xl font-bold">{formatCreditAmount(totalOutstanding)}</p>
          </div>
          
          <div className={cn(
            "p-4 rounded-lg space-y-1",
            overdueAmount > 0 ? "bg-red-500/10" : "bg-muted/50"
          )}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className={cn("h-4 w-4", overdueAmount > 0 && "text-red-600")} />
              Overdue
            </div>
            <p className={cn(
              "text-xl font-bold",
              overdueAmount > 0 ? "text-red-600" : ""
            )}>
              {formatCreditAmount(overdueAmount)}
            </p>
            {overdueCount > 0 && (
              <p className="text-xs text-red-600">{overdueCount} order(s)</p>
            )}
          </div>

          <div className="p-4 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              Available
            </div>
            <p className="text-xl font-bold text-green-600">{formatCreditAmount(available)}</p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Utilization
            </div>
            <p className={cn(
              "text-xl font-bold",
              utilization >= 90 ? "text-red-600" : utilization >= 75 ? "text-amber-600" : "text-green-600"
            )}>
              {utilization}%
            </p>
          </div>
        </div>

        {/* Ledger Table */}
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No credit transactions yet</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const dueDate = new Date(entry.credit_due_date);
                  const daysUntilDue = differenceInDays(dueDate, new Date());
                  const isPaid = entry.payment_status === 'fully_paid' || entry.payment_status === 'overpaid';
                  
                  return (
                    <TableRow key={entry.order_id} className={entry.is_overdue ? "bg-red-500/5" : ""}>
                      <TableCell className="font-medium">
                        {entry.order_number}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(entry.order_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCreditAmount(entry.credit_amount_used)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{format(dueDate, 'MMM d, yyyy')}</span>
                          {!isPaid && (
                            <span className={cn(
                              "text-xs",
                              entry.is_overdue 
                                ? "text-red-600" 
                                : daysUntilDue <= 3 
                                  ? "text-amber-600" 
                                  : "text-muted-foreground"
                            )}>
                              {entry.is_overdue 
                                ? `${Math.abs(daysUntilDue)}d overdue`
                                : daysUntilDue === 0
                                  ? 'Due today'
                                  : `${daysUntilDue}d left`
                              }
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge 
                          status={entry.payment_status} 
                          isOverdue={entry.is_overdue}
                        />
                      </TableCell>
                      <TableCell>
                        <Link to={`/orders/${entry.order_id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentStatusBadge({ 
  status, 
  isOverdue 
}: { 
  status: string; 
  isOverdue: boolean;
}) {
  if (status === 'fully_paid' || status === 'overpaid') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Paid
      </Badge>
    );
  }

  if (isOverdue) {
    return (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Overdue
      </Badge>
    );
  }

  if (status === 'partially_paid') {
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
        <Clock className="h-3 w-3 mr-1" />
        Partial
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      <Clock className="h-3 w-3 mr-1" />
      Pending
    </Badge>
  );
}
