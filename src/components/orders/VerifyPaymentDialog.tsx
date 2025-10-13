import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText, CreditCard, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
    customers?: {
      email?: string;
      company_name?: string;
    };
  };
  onSuccess: () => void;
}

export const VerifyPaymentDialog: React.FC<VerifyPaymentDialogProps> = ({
  open,
  onOpenChange,
  order,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Not authenticated');

      // Step 1: Verify payment and mark as payment_received
      const { error: verifyError } = await supabase
        .from('orders')
        .update({
          status: 'payment_received',
          payment_verified_by: user.id,
          payment_verified_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (verifyError) throw verifyError;

      // Step 2: Auto-progress to processing status
      const { error: progressError } = await supabase
        .from('orders')
        .update({
          status: 'processing',
        })
        .eq('id', order.id);

      if (progressError) throw progressError;

      // Send payment confirmation email to customer
      await supabase.functions.invoke('send-payment-confirmation', {
        body: {
          orderId: order.id,
          orderNumber: order.order_number,
          customerEmail: order.customers?.email,
        },
      }).catch(err => {
        console.error('Email notification error (non-blocking):', err);
      });

      // Notify customer with processing status
      if (order.customer_id) {
        const { error: notifError } = await supabase.from('user_notifications').insert({
          user_id: order.customer_id,
          type: 'order_processing',
          title: 'Order Now Processing',
          message: `Great news! Your payment for order ${order.order_number} has been verified and your order is now being processed. We'll notify you when it's ready to ship.`,
          link: '/customer/orders',
        });
        
        if (notifError) {
          console.error('Customer notification error (non-blocking):', notifError);
        }
      }

      toast({
        title: 'Payment Verified & Processing Started',
        description: `Order ${order.order_number} is now being processed automatically.`,
      });

      onSuccess();
      onOpenChange(false);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Verify Payment</DialogTitle>
          <DialogDescription>
            Review payment details and verify for order {order.order_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Method
              </div>
              <Badge variant="secondary">
                {order.payment_method === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Reference Number</div>
              <div className="font-mono text-sm font-semibold">{order.payment_reference}</div>
            </div>

            {order.payment_proof_uploaded_at && (
              <div className="space-y-2 col-span-2">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Uploaded At
                </div>
                <div className="text-sm">
                  {new Date(order.payment_proof_uploaded_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Payment Proof */}
          {order.payment_proof_url && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Payment Receipt</div>
              <div className="border rounded-lg p-4">
                {order.payment_proof_url.endsWith('.pdf') ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-10 w-10 text-red-500" />
                      <div>
                        <div className="font-medium">Payment Receipt (PDF)</div>
                        <div className="text-sm text-muted-foreground">Click to view full document</div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => window.open(order.payment_proof_url, '_blank')}
                    >
                      View PDF
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <img
                      src={order.payment_proof_url}
                      alt="Payment Proof"
                      className="w-full rounded-lg border"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(order.payment_proof_url, '_blank')}
                      className="w-full"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Open in New Tab
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-900">
              <strong>Before verifying:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Confirm the payment reference matches your records</li>
                <li>Verify the receipt shows correct payment amount</li>
                <li>Check that the payment method matches</li>
                <li>Ensure the transaction is completed</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              'Verifying...'
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify & Approve Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
