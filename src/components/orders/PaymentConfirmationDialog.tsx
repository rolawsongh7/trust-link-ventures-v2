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
      
      // Upload payment proof if provided
      if (paymentProofFile) {
        setUploadingProof(true);
        try {
          // Verify authentication
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Not authenticated. Please log in and try again.');
          }
          
          const fileExt = paymentProofFile.name.split('.').pop();
          const fileName = `${orderId}-payment-proof-${Date.now()}.${fileExt}`;
          const filePath = `payment-proofs/${fileName}`;
          
          console.log('Attempting upload as:', session.user.id, 'to path:', filePath);
          
          const { error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(filePath, paymentProofFile, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
          }
          
          // Get public URL (signed URL for private bucket)
          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('payment-proofs')
            .createSignedUrl(filePath, 31536000); // 1 year expiry
          
          if (urlError) throw urlError;
          
          paymentProofUrl = signedUrlData.signedUrl;
          
          console.log('Payment proof uploaded:', paymentProofUrl);
        } catch (uploadError) {
          console.error('Error uploading payment proof:', uploadError);
          toast.warning('Payment proof upload failed, but reference will be saved');
          // Don't block payment confirmation if upload fails
        } finally {
          setUploadingProof(false);
        }
      }
      // Check if delivery address exists
      if (!deliveryAddressId) {
        // Request delivery address from customer
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
          console.error('Error sending delivery address request:', emailError);
        }

        toast.success('Payment confirmed! Delivery address request sent to customer.');
        
        // Update order with payment reference and status
        await supabase
          .from('orders')
          .update({
            status: 'payment_received',
            payment_reference: paymentReference,
            payment_method: paymentMethod,
            payment_proof_url: paymentProofUrl,
            delivery_notes: deliveryNotes,
          })
          .eq('id', orderId);

        // Send payment confirmation emails
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
          console.error('Error sending payment confirmation email:', confirmEmailError);
        }

        onSuccess();
        onOpenChange(false);
        return;
      }

      // Update order with payment details
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

      if (updateError) throw updateError;

      // Generate invoice
      toast.loading('Generating invoice...');
      
      const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: {
          orderId,
          invoiceType: 'commercial',
          paymentReference,
          deliveryNotes,
        },
      });

      if (invoiceError) throw invoiceError;

      // Send invoice to customer
      const { error: sendError } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          orderId,
          customerEmail,
          invoiceData: invoiceData,
        },
      });

      if (sendError) {
        console.error('Error sending invoice email:', sendError);
        toast.warning('Invoice generated but email failed to send');
      }

      // Send payment confirmation emails
      const { error: confirmEmailError } = await supabase.functions.invoke('send-payment-confirmation', {
        body: {
          orderId,
          orderNumber,
          customerEmail,
          paymentReference,
          paymentProofUrl,
          hasDeliveryAddress: true,
        },
      });

      if (confirmEmailError) {
        console.error('Error sending payment confirmation email:', confirmEmailError);
      }

      toast.success('Payment confirmed and invoice generated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Failed to confirm payment. Please try again.');
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
