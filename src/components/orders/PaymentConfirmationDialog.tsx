import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  deliveryAddressId?: string;
  onSuccess: () => void;
}

export const PaymentConfirmationDialog: React.FC<PaymentConfirmationDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  customerEmail,
  deliveryAddressId,
  onSuccess,
}) => {
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'mobile_money'>('bank_transfer');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }
    
    setPaymentProofFile(file);
  };

  const handleConfirmPayment = async () => {
    if (!paymentReference.trim()) {
      toast.error('Payment reference is required');
      return;
    }

    setLoading(true);

    try {
      let paymentProofUrl = null;
      
      // STEP 1: Upload payment proof (if provided)
      if (paymentProofFile) {
        setUploadingProof(true);
        try {
          // Verify authentication
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.error('[PaymentConfirmation] Session error:', sessionError);
            throw new Error(`Authentication check failed: ${sessionError.message}`);
          }
          
          if (!session) {
            throw new Error('Not authenticated. Please log in and try again.');
          }
          
          console.log('[PaymentConfirmation] Authenticated user:', session.user.id);
          
          const fileExt = paymentProofFile.name.split('.').pop();
          const fileName = `${orderId}-payment-proof-${Date.now()}.${fileExt}`;
          const filePath = `payment-proofs/${fileName}`;
          
          console.log('[PaymentConfirmation] Uploading to:', filePath);
          
          const { error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(filePath, paymentProofFile, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError) {
            console.error('[PaymentConfirmation] Storage upload error:', uploadError);
            throw new Error(`File upload failed: ${uploadError.message}`);
          }
          
          // Get signed URL
          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('payment-proofs')
            .createSignedUrl(filePath, 31536000); // 1 year expiry
          
          if (urlError) {
            console.error('[PaymentConfirmation] Signed URL error:', urlError);
            throw new Error(`Failed to generate file URL: ${urlError.message}`);
          }
          
          paymentProofUrl = signedUrlData.signedUrl;
          
          console.log('[PaymentConfirmation] Payment proof uploaded successfully');
          toast.success('Payment proof uploaded successfully');
        } catch (uploadError) {
          console.error('[PaymentConfirmation] Upload failed:', uploadError);
          toast.error(
            uploadError instanceof Error 
              ? uploadError.message 
              : 'Payment proof upload failed. Continuing without proof file.'
          );
          // Don't block payment confirmation if upload fails
          paymentProofUrl = null;
        } finally {
          setUploadingProof(false);
        }
      }

      // STEP 2: Update order status
      console.log('[PaymentConfirmation] Updating order status...');
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'payment_received',
          payment_reference: paymentReference,
          payment_method: paymentMethod,
          payment_proof_url: paymentProofUrl,
          delivery_notes: deliveryNotes,
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('[PaymentConfirmation] Order update error:', updateError);
        throw new Error(`Failed to update order: ${updateError.message}`);
      }

      console.log('[PaymentConfirmation] Order updated successfully');
      toast.success('Payment details saved');

      // STEP 3: Handle delivery address scenario
      if (!deliveryAddressId) {
        console.log('[PaymentConfirmation] No delivery address - requesting from customer');
        
        // Request delivery address from customer
        try {
          const { error: emailError } = await supabase.functions.invoke('send-email', {
            body: {
              to: customerEmail,
              subject: `Delivery Address Required - Order ${orderNumber}`,
              templateType: 'delivery_address_request',
              templateData: {
                orderNumber,
                message: 'We have received your payment. Please provide your delivery address to complete your order.',
              },
            },
          });

          if (emailError) {
            console.error('[PaymentConfirmation] Delivery address request email error:', emailError);
            throw new Error(`Failed to send address request email: ${emailError.message}`);
          }

          console.log('[PaymentConfirmation] Delivery address request sent');
        } catch (emailError) {
          console.error('[PaymentConfirmation] Email sending failed:', emailError);
          toast.warning('Payment confirmed, but failed to send delivery address request email');
        }

        // Send payment confirmation emails
        try {
          const { error: confirmEmailError } = await supabase.functions.invoke('send-payment-confirmation', {
            body: {
              orderId,
              orderNumber,
              customerEmail,
              paymentReference,
              paymentProofUrl,
              hasDeliveryAddress: false,
            },
          });

          if (confirmEmailError) {
            console.error('[PaymentConfirmation] Confirmation email error:', confirmEmailError);
            toast.warning('Payment confirmed, but confirmation email failed to send');
          } else {
            console.log('[PaymentConfirmation] Confirmation email sent');
          }
        } catch (emailError) {
          console.error('[PaymentConfirmation] Confirmation email exception:', emailError);
        }

        toast.success('Payment confirmed! Delivery address request sent to customer.');
        onSuccess();
        onOpenChange(false);
        return;
      }

      // STEP 3: Send payment confirmation emails (regardless of delivery address)
      console.log('[PaymentConfirmation] Sending payment confirmation...');
      try {
        const { error: confirmEmailError } = await supabase.functions.invoke('send-payment-confirmation', {
          body: {
            orderId,
            orderNumber,
            customerEmail,
            paymentReference,
            paymentProofUrl,
            hasDeliveryAddress: !!deliveryAddressId,
          },
        });

        if (confirmEmailError) {
          console.error('[PaymentConfirmation] Confirmation email error:', confirmEmailError);
          toast.warning('Payment confirmed, but confirmation email failed to send');
        } else {
          console.log('[PaymentConfirmation] Payment confirmation sent successfully');
        }
      } catch (emailError) {
        console.error('[PaymentConfirmation] Confirmation email exception:', emailError);
      }

      // Success message based on delivery address status
      const successMessage = deliveryAddressId 
        ? 'Payment confirmed successfully! Order ready for processing.'
        : 'Payment confirmed! Customer will be notified to provide delivery address.';

      toast.success(successMessage);

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('[PaymentConfirmation] Fatal error:', error);
      
      // Provide specific error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unknown error occurred';
      
      toast.error(`Failed to confirm payment: ${errorMessage}`, {
        duration: 7000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Confirm Payment Received</DialogTitle>
          <DialogDescription>
            Enter payment confirmation details for order {orderNumber}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Payment Method <span className="text-red-500">*</span></Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as 'bank_transfer' | 'mobile_money')}
                disabled={loading}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="bank_transfer" id="bank" />
                  <Label htmlFor="bank" className="flex-1 cursor-pointer">
                    <div className="font-medium">Bank Transfer</div>
                    <div className="text-xs text-muted-foreground">Via Trust Link Bank Ghana</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="mobile_money" id="momo" />
                  <Label htmlFor="momo" className="flex-1 cursor-pointer">
                    <div className="font-medium">Mobile Money</div>
                    <div className="text-xs text-muted-foreground">MTN, Vodafone, or AirtelTigo</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-reference">
                Payment Reference Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="payment-reference"
                placeholder="Enter payment confirmation/reference number"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-proof">
                Payment Proof (Optional)
                <span className="text-xs text-muted-foreground ml-2">
                  - Upload receipt or screenshot
                </span>
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="payment-proof"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileSelect}
                  disabled={loading || uploadingProof}
                  className="cursor-pointer"
                />
                {paymentProofFile && (
                  <Badge variant="secondary" className="whitespace-nowrap">
                    {paymentProofFile.name.substring(0, 20)}
                    {paymentProofFile.name.length > 20 ? '...' : ''}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Accepted: JPG, PNG, PDF • Max size: 5MB
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-notes">Delivery Instructions (Optional)</Label>
              <Textarea
                id="delivery-notes"
                placeholder="Enter any special delivery instructions..."
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>

            {!deliveryAddressId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ No delivery address on file. Customer will be notified to provide delivery details before invoice can be generated.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPayment}
            disabled={loading || uploadingProof || !paymentReference.trim()}
          >
            {loading || uploadingProof ? 
              (uploadingProof ? 'Uploading proof...' : 'Processing...') : 
              'Confirm Payment'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
