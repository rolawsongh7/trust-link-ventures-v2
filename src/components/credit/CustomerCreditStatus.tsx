// Customer Credit Status Widget
// Phase 5.2: Simplified credit view for customer portal

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { useCustomerCreditTerms, useCustomerCreditLedger } from '@/hooks/useCustomerCreditTerms';
import { 
  formatCreditAmount, 
  getAvailableCredit, 
  getCreditUtilization,
  getNetTermsLabel,
  getUtilizationColor,
  type NetTerms,
} from '@/utils/creditHelpers';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface CustomerCreditStatusProps {
  customerId: string;
  compact?: boolean;
}

interface LedgerEntry {
  order_id: string;
  order_number: string;
  credit_amount_used: number;
  credit_due_date: string;
  payment_status: string;
  is_overdue: boolean;
}

export function CustomerCreditStatus({ customerId, compact = false }: CustomerCreditStatusProps) {
  const { data: creditTerms, isLoading: termsLoading } = useCustomerCreditTerms(customerId);
  const { data: ledger, isLoading: ledgerLoading } = useCustomerCreditLedger(customerId);

  const isLoading = termsLoading || ledgerLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // No credit terms or not active
  if (!creditTerms || creditTerms.status !== 'active') {
    return null;
  }

  const available = getAvailableCredit(creditTerms.credit_limit, creditTerms.current_balance);
  const utilization = getCreditUtilization(creditTerms.current_balance, creditTerms.credit_limit);
  const entries = (ledger as LedgerEntry[]) || [];
  
  // Find next due and overdue
  const pendingEntries = entries.filter(
    e => e.payment_status !== 'fully_paid' && e.payment_status !== 'overpaid'
  );
  const overdueEntries = entries.filter(e => e.is_overdue);
  const hasOverdue = overdueEntries.length > 0;

  // Next payment due
  const nextDue = pendingEntries
    .filter(e => !e.is_overdue)
    .sort((a, b) => new Date(a.credit_due_date).getTime() - new Date(b.credit_due_date).getTime())[0];

  if (compact) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Credit Available</p>
                <p className="text-lg font-bold">{formatCreditAmount(available)}</p>
              </div>
            </div>
            <AccountStatusIndicator hasOverdue={hasOverdue} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Credit Account
          </CardTitle>
          <AccountStatusIndicator hasOverdue={hasOverdue} />
        </div>
        <CardDescription>
          {getNetTermsLabel(creditTerms.net_terms as NetTerms)} payment terms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Available Credit */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Available Credit</span>
            <span className="text-lg font-bold">{formatCreditAmount(available)}</span>
          </div>
          <Progress value={100 - utilization} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Used: {formatCreditAmount(creditTerms.current_balance)}</span>
            <span className={getUtilizationColor(utilization)}>{utilization}% utilized</span>
          </div>
        </div>

        {/* Overdue Warning */}
        {hasOverdue && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-600">
                  {overdueEntries.length} overdue payment{overdueEntries.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-600/80 mt-0.5">
                  Please settle to continue using credit
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next Due */}
        {nextDue && !hasOverdue && (
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Next Payment Due</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {format(new Date(nextDue.credit_due_date), 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCreditAmount(nextDue.credit_amount_used)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Good Standing */}
        {!hasOverdue && pendingEntries.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>No outstanding payments</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccountStatusIndicator({ hasOverdue }: { hasOverdue: boolean }) {
  if (hasOverdue) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Action Required
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
      <Shield className="h-3 w-3" />
      Good Standing
    </Badge>
  );
}

/**
 * Minimal credit indicator for headers/navigation
 */
export function CreditStatusBadge({ customerId }: { customerId: string }) {
  const { data: creditTerms, isLoading } = useCustomerCreditTerms(customerId);
  const { data: ledger } = useCustomerCreditLedger(customerId);

  if (isLoading || !creditTerms || creditTerms.status !== 'active') {
    return null;
  }

  const entries = (ledger as LedgerEntry[]) || [];
  const hasOverdue = entries.some(e => e.is_overdue);
  const available = getAvailableCredit(creditTerms.credit_limit, creditTerms.current_balance);

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
      hasOverdue 
        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    )}>
      <CreditCard className="h-3 w-3" />
      <span className="font-medium">{formatCreditAmount(available)}</span>
      {hasOverdue && <AlertTriangle className="h-3 w-3" />}
    </div>
  );
}
