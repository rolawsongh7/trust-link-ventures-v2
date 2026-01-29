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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  CheckCircle, 
  FileText, 
  CreditCard, 
  AlertTriangle, 
  XCircle,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  DollarSign,
  MessageCircleQuestion,
  CalendarIcon,
  ZoomIn,
  Download,
  Minus,
  CreditCard as CardIcon
} from 'lucide-react';
import { format } from 'date-fns';
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
    delivery_address_id?: string;
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
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'vodafone_cash', label: 'Vodafone Cash' },
  { value: 'airteltigo', label: 'AirtelTigo Money' },
  { value: 'mobile_money', label: 'Other Mobile Money' },
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
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [verificationNotes, setVerificationNotes] = useState('');
  const [mismatchAcknowledged, setMismatchAcknowledged] = useState(false);
  const [mismatchJustification, setMismatchJustification] = useState('');
  const [isPartialPayment, setIsPartialPayment] = useState(false);

  // Image zoom state
  const [imageZoom, setImageZoom] = useState(1);
  const [showImageDialog, setShowImageDialog] = useState(false);

  // Rejection state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Clarification state
  const [showClarificationDialog, setShowClarificationDialog] = useState(false);
  const [clarificationMessage, setClarificationMessage] = useState('');

  // Calculate mismatch
  const parsedAmount = parseFloat(amountReceived) || 0;
  const invoiceTotal = order.total_amount || 0;
  const difference = parsedAmount - invoiceTotal;
  const mismatchPercentage = invoiceTotal > 0 ? Math.abs(difference / invoiceTotal) * 100 : 0;
  const hasMismatch = amountReceived !== '' && mismatchPercentage > 1; // More than 1% difference

  // Check if this is an underpayment (potential partial payment)
  const isUnderpayment = parsedAmount > 0 && parsedAmount < invoiceTotal;

  // Validation
  const canProceedToDetails = !!order.payment_proof_url;
  const canProceedToConfirm = useMemo(() => {
    if (!paymentReference.trim()) return false;
    if (!amountReceived || parsedAmount <= 0) return false;
    if (!paymentMethod) return false;
    if (!paymentDate) return false;
    // If payment date is in the future, block
    if (paymentDate > new Date()) return false;
    if (hasMismatch && !isPartialPayment && (!mismatchAcknowledged || !mismatchJustification.trim())) return false;
    return true;
  }, [paymentReference, amountReceived, parsedAmount, paymentMethod, paymentDate, hasMismatch, isPartialPayment, mismatchAcknowledged, mismatchJustification]);

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

      // Calculate payment status based on amount (auto-detect partial payment)
      const existingConfirmed = (order as any).payment_amount_confirmed || 0;
      const totalPaid = existingConfirmed + parsedAmount;
      const isThisBalancePayment = existingConfirmed > 0;
      const paymentType = isThisBalancePayment ? 'balance' : 'deposit';
      
      // Determine if this makes the order fully paid
      const isNowFullyPaid = totalPaid >= invoiceTotal;
      const balanceAfterPayment = Math.max(0, invoiceTotal - totalPaid);

      // Step 1: Mark payment as received with correct payment_status
      // Note: The database trigger will auto-set payment_status based on payment_amount_confirmed
      const orderUpdateData: Record<string, any> = {
        // For partial payments, allow order to progress to processing
        // For full payments, move to payment_received then processing
        status: isNowFullyPaid ? 'payment_received' : (isPartialPayment ? 'pending_payment' : 'payment_received'),
        payment_verified_by: user.id,
        payment_verified_at: new Date().toISOString(),
        payment_reference: paymentReference.trim(),
        payment_amount_confirmed: totalPaid,
        payment_method: paymentMethod,
        payment_date: paymentDate ? format(paymentDate, 'yyyy-MM-dd') : null,
        payment_verification_notes: hasMismatch && !isPartialPayment
          ? `${verificationNotes}\n\n[MISMATCH JUSTIFICATION]: ${mismatchJustification}`
          : isPartialPayment 
            ? `${verificationNotes}\n\n[${paymentType.toUpperCase()} PAYMENT]: ${formatCurrency(parsedAmount)} received. ${isNowFullyPaid ? 'Order fully paid.' : `Balance: ${formatCurrency(balanceAfterPayment)}`}`
            : verificationNotes,
        payment_mismatch_acknowledged: (hasMismatch && !isPartialPayment) ? mismatchAcknowledged : false,
        // Clear any previous rejection
        payment_rejected_at: null,
        payment_rejected_by: null,
        // Clear old-style payment_status_reason (now using payment_status enum)
        payment_status_reason: null,
      };

      const { error: paymentReceivedError } = await supabase
        .from('orders')
        .update(orderUpdateData)
        .eq('id', order.id);

      if (paymentReceivedError) {
        console.error('Failed to mark payment as received:', paymentReceivedError);
        throw new Error(`Failed to confirm payment: ${paymentReceivedError.message}`);
      }

      // Create payment record as ledger entry with payment_type
      supabase.from('payment_records').insert({
        order_id: order.id,
        amount: parsedAmount,
        payment_type: paymentType,
        payment_date: paymentDate ? format(paymentDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim(),
        notes: isNowFullyPaid ? (isThisBalancePayment ? 'Balance payment - Order fully paid' : 'Full payment') : 'Deposit payment',
        recorded_by: user.id,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
        proof_url: order.payment_proof_url,
      }).then(({ error }) => {
        if (error) {
          console.error('Failed to create payment record (non-blocking):', error);
        } else {
          console.log('Payment record created with type:', paymentType);
        }
      });

      // Update invoice if exists - set amount_paid
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, amount_paid')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (invoices && invoices.length > 0) {
        const currentAmountPaid = invoices[0].amount_paid || 0;
        await supabase
          .from('invoices')
          .update({
            amount_paid: currentAmountPaid + parsedAmount,
            status: (currentAmountPaid + parsedAmount) >= invoiceTotal ? 'paid' : 'partial',
          })
          .eq('id', invoices[0].id);
      }

      // Step 2: Move to processing (only if fully paid OR explicitly not partial)
      if (isNowFullyPaid && !isPartialPayment) {
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
      }

      // Send payment confirmation email with payment type awareness
      await supabase.functions.invoke('send-payment-confirmation', {
        body: {
          orderId: order.id,
          orderNumber: order.order_number,
          customerEmail: order.customers?.email,
          paymentReference: paymentReference || order.payment_reference || 'N/A',
          paymentProofUrl: order.payment_proof_url,
          hasDeliveryAddress: !!order.delivery_address_id,
          // New fields for partial payment workflow
          paymentType: isNowFullyPaid ? (isThisBalancePayment ? 'balance' : 'full') : 'deposit',
          amountReceived: parsedAmount,
          totalPaid: totalPaid,
          balanceRemaining: balanceAfterPayment,
          isOrderFullyPaid: isNowFullyPaid,
        },
      }).catch(err => {
        console.error('Email notification error (non-blocking):', err);
      });

      // Notify customer with correct message based on payment type
      if (order.customer_id) {
        const notificationTitle = isNowFullyPaid 
          ? (isThisBalancePayment ? 'Balance Verified - Order Fully Paid' : 'Payment Verified - Order Processing')
          : 'Deposit Received - Balance Required';
        
        const notificationMessage = isNowFullyPaid
          ? `Great news! Your ${isThisBalancePayment ? 'balance payment' : 'payment'} for order ${order.order_number} has been verified. Your order is now fully paid and cleared for shipping.`
          : `Your deposit of ${order.currency} ${parsedAmount.toLocaleString()} for order ${order.order_number} has been verified. Balance remaining: ${order.currency} ${balanceAfterPayment.toLocaleString()}`;

        supabase.from('user_notifications').insert({
          user_id: order.customer_id,
          type: isNowFullyPaid ? (isThisBalancePayment ? 'balance_verified' : 'system') : 'deposit_verified',
          title: notificationTitle,
          message: notificationMessage,
          link: '/portal/orders',
          requires_action: !isNowFullyPaid,
          entity_type: 'order',
          entity_id: order.id,
          deep_link: isNowFullyPaid ? `/portal/orders?highlight=${order.id}` : `/portal/orders?uploadPayment=${order.id}`,
        }).then(() => {
          console.log('Customer notification sent:', isNowFullyPaid ? 'full payment' : 'deposit');
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

      // Success toast with correct messaging
      const toastTitle = isNowFullyPaid
        ? (isThisBalancePayment ? 'Balance Verified - Order Fully Paid' : 'Payment Verified & Processing Started')
        : 'Deposit Verified';
      
      const toastDescription = isNowFullyPaid
        ? `Order ${order.order_number} is now fully paid (${order.currency} ${totalPaid.toLocaleString()}) and cleared for shipping.`
        : `Deposit of ${order.currency} ${parsedAmount.toLocaleString()} verified. Balance remaining: ${order.currency} ${balanceAfterPayment.toLocaleString()}`;

      toast({
        title: toastTitle,
        description: toastDescription,
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

  const handleRequestClarification = async () => {
    if (!clarificationMessage.trim()) {
      toast({
        title: 'Message Required',
        description: 'Please provide a message explaining what clarification you need.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update order with clarification request
      const { error } = await supabase
        .from('orders')
        .update({
          payment_clarification_requested_at: new Date().toISOString(),
          payment_clarification_message: clarificationMessage.trim(),
          payment_status_reason: `Clarification requested: ${clarificationMessage.trim()}`,
        })
        .eq('id', order.id);

      if (error) throw error;

      // Send clarification email (non-blocking)
      supabase.functions.invoke('send-email', {
        body: {
          to: order.customers?.email,
          subject: `Clarification Needed for Order ${order.order_number}`,
          type: 'payment_clarification_needed',
          data: {
            customerName: order.customers?.company_name,
            orderNumber: order.order_number,
            message: clarificationMessage.trim(),
            portalLink: `${window.location.origin}/portal/orders`,
          },
        },
      }).catch(err => {
        console.error('Email notification error (non-blocking):', err);
      });

      // Notify customer in-app (non-blocking)
      if (order.customer_id) {
        supabase.from('user_notifications').insert({
          user_id: order.customer_id,
          type: 'system',
          title: 'Payment Clarification Needed',
          message: `We need additional information about your payment for order ${order.order_number}: ${clarificationMessage}`,
          link: '/portal/orders',
        }).then(() => {
          console.log('Customer clarification notification sent');
        });
      }

      toast({
        title: 'Clarification Requested',
        description: `Customer has been notified to provide additional information for order ${order.order_number}.`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();

    } catch (error: any) {
      console.error('Error requesting clarification:', error);
      toast({
        title: 'Request Failed',
        description: error.message || 'Failed to request clarification',
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
    setPaymentDate(new Date());
    setVerificationNotes('');
    setMismatchAcknowledged(false);
    setMismatchJustification('');
    setIsPartialPayment(false);
    setImageZoom(1);
    setShowImageDialog(false);
    setShowRejectDialog(false);
    setRejectionReason('');
    setShowClarificationDialog(false);
    setClarificationMessage('');
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
                  <div className="rounded-lg border overflow-hidden bg-muted/20 relative">
                    {order.payment_proof_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <div className="relative">
                        <img 
                          src={order.payment_proof_url} 
                          alt="Payment proof"
                          className="max-h-64 w-full object-contain cursor-zoom-in transition-transform"
                          style={{ transform: `scale(${imageZoom})` }}
                          onClick={() => setShowImageDialog(true)}
                        />
                        <div className="absolute bottom-2 right-2 flex gap-1">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={() => setImageZoom(Math.min(imageZoom + 0.5, 3))}
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={() => setImageZoom(Math.max(imageZoom - 0.5, 1))}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Document uploaded</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(order.payment_proof_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Full Size
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = order.payment_proof_url!;
                        link.download = `payment-proof-${order.order_number}`;
                        link.click();
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
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

              {/* Underpayment - Partial Payment Option */}
              {isUnderpayment && (
                <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                  <CardIcon className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800 dark:text-blue-200">Partial Payment Detected</AlertTitle>
                  <AlertDescription className="text-blue-700 dark:text-blue-300">
                    <p className="mb-3">
                      Amount received ({formatCurrency(parsedAmount)}) is less than invoice total ({formatCurrency(invoiceTotal)}).
                      Balance remaining: <strong>{formatCurrency(invoiceTotal - parsedAmount)}</strong>
                    </p>
                    
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="partial_payment"
                        checked={isPartialPayment}
                        onCheckedChange={(checked) => {
                          setIsPartialPayment(checked === true);
                          if (checked) {
                            setMismatchAcknowledged(false);
                            setMismatchJustification('');
                          }
                        }}
                      />
                      <Label htmlFor="partial_payment" className="text-sm cursor-pointer">
                        Record as partial payment (order will remain in pending payment status)
                      </Label>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Mismatch Warning - Only show if not partial payment and there's a mismatch */}
              {hasMismatch && !isPartialPayment && (
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

              <div className="grid grid-cols-2 gap-4">
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
                  <Label className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    Payment Date
                    <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !paymentDate && "text-muted-foreground",
                          !paymentDate && "border-amber-500",
                          paymentDate && paymentDate > new Date() && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {paymentDate ? format(paymentDate, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={paymentDate}
                        onSelect={setPaymentDate}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {paymentDate && paymentDate > new Date() && (
                    <p className="text-xs text-destructive">Payment date cannot be in the future</p>
                  )}
                </div>
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
                <div className="p-3 flex justify-between">
                  <span className="text-muted-foreground">Payment Date</span>
                  <span className="font-medium">
                    {paymentDate ? format(paymentDate, 'PPP') : 'Not specified'}
                  </span>
                </div>
                {isPartialPayment && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20">
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Partial Payment</span>
                    <span className="text-sm block mt-1 text-blue-600 dark:text-blue-400">
                      Balance remaining: {formatCurrency(invoiceTotal - parsedAmount)}
                    </span>
                  </div>
                )}
                {verificationNotes && (
                  <div className="p-3">
                    <span className="text-muted-foreground block mb-1">Notes</span>
                    <span className="text-sm">{verificationNotes}</span>
                  </div>
                )}
                {hasMismatch && !isPartialPayment && mismatchJustification && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20">
                    <span className="text-muted-foreground block mb-1">Mismatch Justification</span>
                    <span className="text-sm">{mismatchJustification}</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {isPartialPayment ? (
                  <>
                    Payment will be recorded and the order will remain in <strong>Pending Payment</strong> status 
                    until full payment is received.
                  </>
                ) : (
                  <>
                    After verification, the order will automatically move to <strong>Processing</strong> status 
                    and the customer will be notified.
                  </>
                )}
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

          {/* Clarification Dialog Content */}
          {showClarificationDialog && (
            <div className="space-y-4 py-4">
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <MessageCircleQuestion className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 dark:text-amber-200">Request Clarification</AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-300">
                  The customer will receive your message and can respond with more information.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="clarification_message" className="flex items-center gap-1">
                  What information do you need?
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="clarification_message"
                  value={clarificationMessage}
                  onChange={(e) => setClarificationMessage(e.target.value)}
                  placeholder="e.g., Please provide a clearer image of the payment confirmation showing the transaction reference..."
                  rows={4}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                <p><strong>Example questions:</strong></p>
                <ul className="list-disc ml-4 mt-1 space-y-1">
                  <li>Can you provide the full transaction reference?</li>
                  <li>The payment date on the proof doesn't match our records</li>
                  <li>Please upload a clearer image of the receipt</li>
                </ul>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!showRejectDialog && !showClarificationDialog ? (
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
                  <>
                    <Button
                      variant="outline"
                      className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                      onClick={() => setShowClarificationDialog(true)}
                      disabled={loading}
                    >
                      <MessageCircleQuestion className="h-4 w-4 mr-2" />
                      Clarify
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={loading}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
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
                    className="flex-1 sm:flex-none"
                    variant="default"
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
          ) : showRejectDialog ? (
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
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowClarificationDialog(false);
                  setClarificationMessage('');
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="border-amber-500 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleRequestClarification}
                disabled={loading || !clarificationMessage.trim()}
              >
                {loading ? 'Sending...' : (
                  <>
                    <MessageCircleQuestion className="h-4 w-4 mr-2" />
                    Send Clarification Request
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
