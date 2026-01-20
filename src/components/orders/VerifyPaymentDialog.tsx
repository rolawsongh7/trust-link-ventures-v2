import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle, 
  FileText, 
  CreditCard, 
  AlertTriangle, 
  XCircle,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface VerifyPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    order_number: string;
    payment_proof_url?: string;
    payment_reference?: string;
    payment_method?: string;
    payment_proof_uploaded_at?: string;
    customer_id: string;
    total_amount: number;
    currency: string;
    customers?: {
      email?: string;
      company_name?: string;
    };
  };
  onSuccess: () => void;
}

type Step = 'review' | 'details' | 'confirm';

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export const VerifyPaymentDialog: React.FC<VerifyPaymentDialogProps> = ({
  open,
  onOpenChange,
  order,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('review');
  
  // Form state
  const [paymentReference, setPaymentReference] = useState(order.payment_reference || '');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState(order.payment_method || '');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [mismatchAcknowledged, setMismatchAcknowledged] = useState(false);
  const [mismatchJustification, setMismatchJustification] = useState('');

  // Rejection state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Calculate mismatch
  const parsedAmount = parseFloat(amountReceived) || 0;
  const invoiceTotal = order.total_amount || 0;
  const difference = parsedAmount - invoiceTotal;
  const mismatchPercentage = invoiceTotal > 0 ? Math.abs(difference / invoiceTotal) * 100 : 0;
  const hasMismatch = amountReceived !== '' && mismatchPercentage > 1; // More than 1% difference

  // Validation
  const canProceedToDetails = !!order.payment_proof_url;
  const canProceedToConfirm = useMemo(() => {
    if (!paymentReference.trim()) return false;
    if (!amountReceived || parsedAmount <= 0) return false;
    if (!paymentMethod) return false;
    if (hasMismatch && (!mismatchAcknowledged || !mismatchJustification.trim())) return false;
    return true;
  }, [paymentReference, amountReceived, parsedAmount, paymentMethod, hasMismatch, mismatchAcknowledged, mismatchJustification]);

  const handleVerify = async () => {
    if (!canProceedToConfirm) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill in all required fields before verifying.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 1: Mark payment as received with all verification details
      const { error: paymentReceivedError } = await supabase
        .from('orders')
        .update({
          status: 'payment_received',
          payment_verified_by: user.id,
          payment_verified_at: new Date().toISOString(),
          payment_reference: paymentReference.trim(),
          payment_amount_confirmed: parsedAmount,
          payment_method: paymentMethod,
          payment_verification_notes: hasMismatch 
            ? `${verificationNotes}\n\n[MISMATCH JUSTIFICATION]: ${mismatchJustification}`
            : verificationNotes,
          payment_mismatch_acknowledged: hasMismatch ? mismatchAcknowledged : false,
          // Clear any previous rejection
          payment_rejected_at: null,
          payment_rejected_by: null,
          payment_status_reason: null,
        })
        .eq('id', order.id);

      if (paymentReceivedError) {
        console.error('Failed to mark payment as received:', paymentReceivedError);
        throw new Error(`Failed to confirm payment: ${paymentReceivedError.message}`);
      }

      // Step 2: Move to processing
      const { error: processingError } = await supabase
        .from('orders')
        .update({
          status: 'processing',
          processing_started_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (processingError) {
        console.error('Failed to move order to processing:', processingError);
        toast({
          title: 'Partial Success',
          description: 'Payment confirmed but order not moved to processing. Please manually update status.',
          variant: 'destructive',
        });
        return;
      }

      // Send payment confirmation email (non-blocking)
      await supabase.functions.invoke('send-payment-confirmation', {
        body: {
          orderId: order.id,
          orderNumber: order.order_number,
          customerEmail: order.customers?.email,
          amountConfirmed: parsedAmount,
          currency: order.currency,
        },
      }).catch(err => {
        console.error('Email notification error (non-blocking):', err);
      });

      // Notify customer with system notification (non-blocking)
      if (order.customer_id) {
        supabase.from('user_notifications').insert({
          user_id: order.customer_id,
          type: 'system',
          title: 'Payment Verified - Order Processing',
          message: `Great news! Your payment of ${order.currency} ${parsedAmount.toLocaleString()} for order ${order.order_number} has been verified and your order is now being processed.`,
          link: '/portal/orders',
        }).then(() => {
          console.log('Customer notification sent');
        });
      }

      // If mismatch was overridden, notify admins (non-blocking)
      if (hasMismatch && mismatchAcknowledged) {
        supabase.from('user_notifications').insert({
          user_id: user.id,
          type: 'system',
          title: 'Payment Mismatch Override',
          message: `Payment mismatch approved for ${order.order_number}. Invoice: ${order.currency} ${invoiceTotal.toLocaleString()}, Received: ${order.currency} ${parsedAmount.toLocaleString()}. Reason: ${mismatchJustification}`,
          link: '/admin/finance/reconciliation',
        }).then(() => {
          console.log('Admin notification sent');
        });
      }

      toast({
        title: 'Payment Verified & Processing Started',
        description: `Order ${order.order_number} payment confirmed (${order.currency} ${parsedAmount.toLocaleString()}) and moved to processing.`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();

    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast({
        title: 'Verification Failed',
        description: error.message || 'Failed to verify payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for rejecting the payment.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use type assertion since payment_rejected is added to enum via migration
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'payment_rejected' as any, // Cast needed until types regenerate
          payment_rejected_at: new Date().toISOString(),
          payment_rejected_by: user.id,
          payment_status_reason: rejectionReason.trim(),
        })
        .eq('id', order.id);

      if (error) throw error;

      // Notify customer (non-blocking)
      if (order.customer_id) {
        supabase.from('user_notifications').insert({
          user_id: order.customer_id,
          type: 'system',
          title: 'Payment Proof Rejected',
          message: `Your payment proof for order ${order.order_number} was rejected: ${rejectionReason}. Please upload a new payment proof.`,
          link: '/portal/orders',
        }).then(() => {
          console.log('Customer rejection notification sent');
        });
      }

      toast({
        title: 'Payment Rejected',
        description: `Order ${order.order_number} payment proof has been rejected. Customer has been notified.`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();

    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      toast({
        title: 'Rejection Failed',
        description: error.message || 'Failed to reject payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep('review');
    setPaymentReference(order.payment_reference || '');
    setAmountReceived('');
    setPaymentMethod(order.payment_method || '');
    setVerificationNotes('');
    setMismatchAcknowledged(false);
    setMismatchJustification('');
    setShowRejectDialog(false);
    setRejectionReason('');
  };

  const formatCurrency = (amount: number) => {
    return `${order.currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Step indicators
  const steps: { key: Step; label: string; number: number }[] = [
    { key: 'review', label: 'Review Proof', number: 1 },
    { key: 'details', label: 'Verification Details', number: 2 },
    { key: 'confirm', label: 'Confirm', number: 3 },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Verify Payment - {order.order_number}
          </DialogTitle>
          <DialogDescription>
            Review payment proof and enter verification details
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-lg">
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              <div 
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  currentStepIndex >= index ? "text-primary" : "text-muted-foreground"
                )}
                onClick={() => {
                  if (index < currentStepIndex) setCurrentStep(step.key);
                }}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  currentStepIndex >= index 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {currentStepIndex > index ? <CheckCircle className="h-4 w-4" /> : step.number}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </React.Fragment>
          ))}
        </div>

        <ScrollArea className="max-h-[50vh] pr-4">
          {/* Step 1: Review Payment Proof */}
          {currentStep === 'review' && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border bg-card p-4">
                <Label className="text-sm font-medium mb-2 block">Invoice Total</Label>
                <p className="text-2xl font-bold text-primary">{formatCurrency(invoiceTotal)}</p>
              </div>

              {order.payment_proof_url ? (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Payment Proof Uploaded
                  </Label>
                  <div className="rounded-lg border overflow-hidden bg-muted/20">
                    {order.payment_proof_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img 
                        src={order.payment_proof_url} 
                        alt="Payment proof"
                        className="max-h-64 w-full object-contain"
                      />
                    ) : (
                      <div className="p-8 text-center">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Document uploaded</p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(order.payment_proof_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Size
                  </Button>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>No Payment Proof</AlertTitle>
                  <AlertDescription>
                    Customer has not uploaded payment proof yet.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Customer Provided Method</Label>
                  <p className="font-medium">{order.payment_method || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Uploaded At</Label>
                  <p className="font-medium">
                    {order.payment_proof_uploaded_at 
                      ? new Date(order.payment_proof_uploaded_at).toLocaleString() 
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Enter Verification Details */}
          {currentStep === 'details' && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border bg-card p-4 mb-4">
                <Label className="text-sm font-medium mb-1 block text-muted-foreground">Invoice Total</Label>
                <p className="text-xl font-bold text-primary">{formatCurrency(invoiceTotal)}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_reference" className="flex items-center gap-1">
                  Payment Reference / Transaction ID
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="payment_reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Enter payment reference or transaction ID"
                  className={cn(!paymentReference.trim() && "border-amber-500")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount_received" className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Amount Received ({order.currency})
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount_received"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder={`Enter amount in ${order.currency}`}
                  className={cn(!amountReceived && "border-amber-500")}
                />
              </div>

              {/* Mismatch Warning */}
              {hasMismatch && (
                <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 dark:text-amber-200">Amount Mismatch Detected</AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    <p className="mb-3">
                      Payment ({formatCurrency(parsedAmount)}) differs from invoice ({formatCurrency(invoiceTotal)}) by{' '}
                      <strong>{formatCurrency(Math.abs(difference))}</strong> ({mismatchPercentage.toFixed(1)}%)
                    </p>
                    
                    <div className="space-y-3 mt-4">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id="mismatch_ack"
                          checked={mismatchAcknowledged}
                          onCheckedChange={(checked) => setMismatchAcknowledged(checked === true)}
                        />
                        <Label htmlFor="mismatch_ack" className="text-sm cursor-pointer">
                          I confirm this payment amount is acceptable
                        </Label>
                      </div>

                      {mismatchAcknowledged && (
                        <div className="space-y-2">
                          <Label htmlFor="mismatch_justification" className="flex items-center gap-1">
                            Justification
                            <span className="text-destructive">*</span>
                          </Label>
                          <Textarea
                            id="mismatch_justification"
                            value={mismatchJustification}
                            onChange={(e) => setMismatchJustification(e.target.value)}
                            placeholder="Explain why this mismatch is acceptable (e.g., customer agreed to pay balance on next order)"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="payment_method" className="flex items-center gap-1">
                  Payment Method
                  <span className="text-destructive">*</span>
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className={cn(!paymentMethod && "border-amber-500")}>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification_notes">Verification Notes (Optional)</Label>
                <Textarea
                  id="verification_notes"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Any additional notes about the verification..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === 'confirm' && (
            <div className="space-y-4 py-4">
              <Alert className="bg-primary/5 border-primary/20">
                <CheckCircle className="h-4 w-4 text-primary" />
                <AlertTitle>Ready to Verify</AlertTitle>
                <AlertDescription>
                  Please review the details below before confirming.
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border divide-y">
                <div className="p-3 flex justify-between">
                  <span className="text-muted-foreground">Invoice Total</span>
                  <span className="font-medium">{formatCurrency(invoiceTotal)}</span>
                </div>
                <div className={cn(
                  "p-3 flex justify-between",
                  hasMismatch && "bg-amber-50 dark:bg-amber-950/20"
                )}>
                  <span className="text-muted-foreground">Amount Received</span>
                  <span className={cn("font-medium", hasMismatch && "text-amber-600")}>
                    {formatCurrency(parsedAmount)}
                    {hasMismatch && ` (${difference > 0 ? '+' : ''}${formatCurrency(difference)})`}
                  </span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-muted-foreground">Payment Reference</span>
                  <span className="font-medium font-mono">{paymentReference}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="font-medium">
                    {PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || paymentMethod}
                  </span>
                </div>
                {verificationNotes && (
                  <div className="p-3">
                    <span className="text-muted-foreground block mb-1">Notes</span>
                    <span className="text-sm">{verificationNotes}</span>
                  </div>
                )}
                {hasMismatch && mismatchJustification && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20">
                    <span className="text-muted-foreground block mb-1">Mismatch Justification</span>
                    <span className="text-sm">{mismatchJustification}</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                After verification, the order will automatically move to <strong>Processing</strong> status 
                and the customer will be notified.
              </p>
            </div>
          )}

          {/* Rejection Dialog Content */}
          {showRejectDialog && (
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Reject Payment Proof</AlertTitle>
                <AlertDescription>
                  The customer will be notified and asked to resubmit their payment proof.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="rejection_reason" className="flex items-center gap-1">
                  Rejection Reason
                  <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={rejectionReason.startsWith('Custom:') ? 'other' : rejectionReason} 
                  onValueChange={(value) => {
                    if (value === 'other') {
                      setRejectionReason('Custom: ');
                    } else {
                      setRejectionReason(value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Invalid payment proof - document is unreadable">Invalid payment proof - document is unreadable</SelectItem>
                    <SelectItem value="Payment reference could not be verified">Payment reference could not be verified</SelectItem>
                    <SelectItem value="Amount on proof does not match invoice">Amount on proof does not match invoice</SelectItem>
                    <SelectItem value="Payment proof appears to be for a different transaction">Payment proof appears to be for a different transaction</SelectItem>
                    <SelectItem value="Document is incomplete or cut off">Document is incomplete or cut off</SelectItem>
                    <SelectItem value="other">Other (specify below)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {rejectionReason.startsWith('Custom:') && (
                <div className="space-y-2">
                  <Label htmlFor="custom_reason">Custom Reason</Label>
                  <Textarea
                    id="custom_reason"
                    value={rejectionReason.replace('Custom: ', '')}
                    onChange={(e) => setRejectionReason(`Custom: ${e.target.value}`)}
                    placeholder="Enter the reason for rejection..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!showRejectDialog ? (
            <>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentStep === 'review') {
                      onOpenChange(false);
                    } else {
                      setCurrentStep(currentStep === 'confirm' ? 'details' : 'review');
                    }
                  }}
                  disabled={loading}
                >
                  {currentStep === 'review' ? 'Cancel' : (
                    <>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </>
                  )}
                </Button>

                {currentStep === 'review' && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={loading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                )}
              </div>

              <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                {currentStep === 'review' && (
                  <Button
                    onClick={() => setCurrentStep('details')}
                    disabled={!canProceedToDetails || loading}
                    className="flex-1 sm:flex-none"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}

                {currentStep === 'details' && (
                  <Button
                    onClick={() => setCurrentStep('confirm')}
                    disabled={!canProceedToConfirm || loading}
                    className="flex-1 sm:flex-none"
                  >
                    Review & Confirm
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}

                {currentStep === 'confirm' && (
                  <Button
                    onClick={handleVerify}
                    disabled={loading}
                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Verifying...' : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verify & Approve Payment
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={loading || !rejectionReason.trim()}
              >
                {loading ? 'Rejecting...' : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Confirm Rejection
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
