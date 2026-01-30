import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Eye, CheckCircle, Clock, XCircle, FileImage, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentProofViewerDialog } from './PaymentProofViewerDialog';
import { getPaymentTypeLabel } from '@/types/payment';
import type { PaymentType } from '@/types/payment';

interface PaymentRecord {
  id: string;
  order_id: string;
  amount: number;
  payment_type: PaymentType;
  payment_date: string;
  proof_url: string | null;
  verified_at: string | null;
  created_at: string;
}

interface PaymentSummaryCardProps {
  orderId: string;
  orderCurrency: string;
  totalAmount: number;
  compact?: boolean;
}

export const PaymentSummaryCard = ({
  orderId,
  orderCurrency,
  totalAmount,
  compact = false,
}: PaymentSummaryCardProps) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('payment_records')
          .select('id, order_id, amount, payment_type, payment_date, proof_url, verified_at, created_at')
          .eq('order_id', orderId)
          .order('payment_date', { ascending: true });

        if (fetchError) throw fetchError;

        setPayments(data || []);
      } catch (err) {
        console.error('[PaymentSummaryCard] Error fetching payments:', err);
        setError('Failed to load payment history');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchPayments();
    }
  }, [orderId]);

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      GHS: '₵',
    };
    return symbols[currency] || currency;
  };

  const totalPaid = payments
    .filter((p) => p.verified_at)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const balanceRemaining = Math.max(0, totalAmount - totalPaid);

  const getStatusBadge = (payment: PaymentRecord) => {
    if (payment.verified_at) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1">
          <CheckCircle className="h-3 w-3" />
          Verified
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  };

  const handleViewProof = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setViewerOpen(true);
  };

  // Don't render if no payments
  if (!loading && payments.length === 0) {
    return null;
  }

  if (compact) {
    // Compact version for mobile dialog
    return (
      <>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CreditCard className="h-4 w-4" />
            <span>Payments ({payments.length})</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getPaymentTypeLabel(payment.payment_type)}</span>
                      {getStatusBadge(payment)}
                    </div>
                    <div className="text-muted-foreground text-xs mt-0.5">
                      {getCurrencySymbol(orderCurrency)}
                      {Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  {payment.proof_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => handleViewProof(payment)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}

              <div className="pt-2 border-t text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Total Paid:</span>
                  <span className="font-medium text-foreground">
                    {getCurrencySymbol(orderCurrency)}
                    {totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {balanceRemaining > 0 && (
                  <div className="flex justify-between mt-1">
                    <span>Balance:</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      {getCurrencySymbol(orderCurrency)}
                      {balanceRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <PaymentProofViewerDialog
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          proofUrl={selectedPayment?.proof_url ?? null}
          paymentType={selectedPayment?.payment_type ?? 'deposit'}
          paymentDate={selectedPayment?.payment_date ?? selectedPayment?.created_at ?? ''}
        />
      </>
    );
  }

  // Full card version for desktop
  return (
    <>
      <Card className="border-tl-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5 text-primary" />
            Payments
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Track your payments and verification status
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : (
            <>
              {/* Payment entries */}
              <div className="space-y-3">
                {payments.map((payment, index) => (
                  <div key={payment.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {getPaymentTypeLabel(payment.payment_type)}
                          </span>
                          {getStatusBadge(payment)}
                        </div>
                        <div className="text-lg font-semibold mt-1">
                          {getCurrencySymbol(orderCurrency)}
                          {Number(payment.amount).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {payment.verified_at ? (
                            <>
                              Verified:{' '}
                              {new Date(payment.verified_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </>
                          ) : (
                            <>
                              Uploaded:{' '}
                              {new Date(payment.payment_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </>
                          )}
                        </div>
                      </div>

                      {payment.proof_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 shrink-0"
                          onClick={() => handleViewProof(payment)}
                        >
                          <FileImage className="h-4 w-4" />
                          View Proof
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary footer */}
              <div className="pt-4 border-t space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Paid</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {getCurrencySymbol(orderCurrency)}
                    {totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {balanceRemaining > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Balance Remaining</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {getCurrencySymbol(orderCurrency)}
                      {balanceRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {balanceRemaining === 0 && (
                  <div className="flex items-center justify-center gap-2 pt-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Fully Paid</span>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <PaymentProofViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        proofUrl={selectedPayment?.proof_url ?? null}
        paymentType={selectedPayment?.payment_type ?? 'deposit'}
        paymentDate={selectedPayment?.payment_date ?? selectedPayment?.created_at ?? ''}
      />
    </>
  );
};
