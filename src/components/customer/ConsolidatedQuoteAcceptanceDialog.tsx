import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  MapPin, 
  Plus, 
  CreditCard, 
  Building2, 
  Smartphone,
  Upload,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';

interface Address {
  id: string;
  receiver_name: string;
  phone_number: string;
  ghana_digital_address: string;
  region: string;
  city: string;
  area?: string;
  street_address: string;
  additional_directions?: string;
  is_default: boolean;
}

interface Quote {
  id: string;
  quote_number: string;
  total_amount: number;
  currency: string;
  customer_id?: string;
}

interface ConsolidatedQuoteAcceptanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote;
  onSuccess: () => void;
}

type Step = 'address' | 'payment';

export const ConsolidatedQuoteAcceptanceDialog: React.FC<ConsolidatedQuoteAcceptanceDialogProps> = ({
  open,
  onOpenChange,
  quote,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { profile } = useCustomerAuth();
  const [currentStep, setCurrentStep] = useState<Step>('address');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Payment proof fields
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'mobile_money'>('mobile_money');
  const [paymentReference, setPaymentReference] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

  useEffect(() => {
    if (open && profile) {
      fetchAddresses();
    }
  }, [open, profile]);

  const fetchAddresses = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', profile.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAddresses(data || []);
      
      const defaultAddress = data?.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      } else if (data && data.length > 0) {
        setSelectedAddressId(data[0].id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load addresses',
        variant: 'destructive',
      });
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a JPG, PNG, or PDF file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File Too Large',
        description: 'File size must be less than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setUploadStatus('idle');
  };

  const uploadWithRetry = async (file: File, customerId: string, orderNumber: string, maxRetries = 3): Promise<string> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${customerId}/${orderNumber}-${Date.now()}.${fileExt}`;
        
        setUploadProgress((attempt - 1) * 30);
        
        const { data, error } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;
        
        setUploadProgress(90);

        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName);

        setUploadProgress(100);
        return publicUrl;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError || new Error('Upload failed after all retries');
  };

  const handleProceedToPayment = () => {
    if (!selectedAddressId) {
      toast({
        title: 'No Address Selected',
        description: 'Please select a delivery address',
        variant: 'destructive',
      });
      return;
    }
    setCurrentStep('payment');
  };

  const handleSubmit = async () => {
    if (!selectedAddressId) {
      toast({
        title: 'Error',
        description: 'Please select a delivery address',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    setUploadStatus('uploading');

    try {
      let paymentProofUrl = null;
      
      // Upload payment proof if provided
      if (selectedFile && paymentReference.trim() && profile) {
        paymentProofUrl = await uploadWithRetry(selectedFile, profile.id, quote.quote_number);
      }

      // Accept the quote and create order with delivery address
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', quote.id);

      if (quoteError) throw quoteError;

      // The auto_convert_quote_to_order trigger will create the order
      // We need to wait a moment for it to complete, then update with address and payment info
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Find the created order
      const { data: orders, error: orderFetchError } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('quote_id', quote.id)
        .single();

      if (orderFetchError) throw orderFetchError;

      // Update the order with delivery address and payment proof
      const updateData: any = {
        delivery_address_id: selectedAddressId,
      };

      if (paymentProofUrl) {
        updateData.payment_proof_url = paymentProofUrl;
        updateData.payment_reference = paymentReference;
        updateData.payment_method = paymentMethod;
        updateData.payment_proof_uploaded_at = new Date().toISOString();
      }

      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orders.id);

      if (orderUpdateError) throw orderUpdateError;

      // Send notification if payment proof was uploaded
      if (paymentProofUrl) {
        await supabase.functions.invoke('notify-payment-proof-uploaded', {
          body: {
            orderId: orders.id,
            orderNumber: orders.order_number,
            paymentMethod,
            paymentReference,
          },
        }).catch(err => console.error('Notification error:', err));
      }

      setUploadStatus('success');

      toast({
        title: 'Quote Accepted Successfully!',
        description: paymentProofUrl 
          ? 'Your order has been created and payment proof submitted for verification.'
          : 'Your order has been created. Please upload payment proof when ready.',
      });

      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        resetForm();
      }, 1500);

    } catch (error: any) {
      console.error('Error accepting quote:', error);
      setUploadStatus('error');
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept quote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep('address');
    setSelectedAddressId('');
    setPaymentMethod('mobile_money');
    setPaymentReference('');
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus('idle');
  };

  const handleAddNewAddress = () => {
    onOpenChange(false);
    toast({
      title: 'Add New Address',
      description: 'Please go to your addresses page to add a new delivery address',
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Accept Quote & Complete Order</DialogTitle>
          <DialogDescription>
            Quote {quote.quote_number} • {quote.currency} {quote.total_amount.toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex items-center gap-2 ${currentStep === 'address' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'address' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              1
            </div>
            <span className="text-sm font-medium">Delivery Address</span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className={`flex items-center gap-2 ${currentStep === 'payment' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'payment' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              2
            </div>
            <span className="text-sm font-medium">Payment</span>
          </div>
        </div>

        {currentStep === 'address' ? (
          // Address Selection Step
          <div className="space-y-4">
            {loadingAddresses ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">Loading addresses...</p>
              </div>
            ) : addresses.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8">
                <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No addresses found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  You need to add a delivery address before accepting this quote
                </p>
                <Button onClick={handleAddNewAddress}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Delivery Address
                </Button>
              </div>
            ) : (
              <>
                <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId}>
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer hover:bg-accent ${
                        selectedAddressId === address.id ? 'border-primary bg-accent' : ''
                      }`}
                      onClick={() => setSelectedAddressId(address.id)}
                    >
                      <RadioGroupItem value={address.id} id={address.id} />
                      <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{address.receiver_name}</p>
                            {address.is_default && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{address.phone_number}</p>
                          <div className="flex items-start gap-2 mt-2">
                            <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div className="text-sm">
                              <p className="font-medium">Digital Address: {address.ghana_digital_address}</p>
                              <p className="text-muted-foreground">
                                {address.street_address}
                                {address.area && `, ${address.area}`}
                              </p>
                              <p className="text-muted-foreground">
                                {address.city}, {address.region}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <div className="flex justify-between items-center pt-4 border-t">
                  <Button variant="outline" onClick={handleAddNewAddress}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Address
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleProceedToPayment} disabled={!selectedAddressId}>
                      Continue to Payment
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          // Payment Step
          <div className="space-y-6">
            {/* Payment Instructions */}
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Instructions
              </h4>
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Bank Transfer</p>
                    <p className="text-muted-foreground">Bank: Zenith Bank Ghana</p>
                    <p className="text-muted-foreground">Account: 9070077717</p>
                    <p className="text-muted-foreground">Name: TRUSTLINK VENTURES LIMITED</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Mobile Money</p>
                    <p className="text-muted-foreground">MTN: 0553506647</p>
                    <p className="text-muted-foreground">Vodafone: 0507040648</p>
                    <p className="text-muted-foreground">Name: TRUSTLINK VENTURES LIMITED</p>
                  </div>
                </div>
              </div>

              <div className="bg-background p-3 rounded border">
                <p className="text-sm font-medium">Amount to Pay:</p>
                <p className="text-2xl font-bold text-primary">
                  {quote.currency} {quote.total_amount.toLocaleString()}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold">Upload Payment Proof (Optional - Can do later)</h4>
              <p className="text-sm text-muted-foreground">
                You can upload your payment receipt now or later from your orders page
              </p>

              {/* Payment Method */}
              <div className="space-y-3">
                <Label>Payment Method</Label>
                <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent">
                    <RadioGroupItem value="mobile_money" id="mobile_money" />
                    <Label htmlFor="mobile_money" className="flex-1 cursor-pointer">
                      Mobile Money
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent">
                    <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                    <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                      Bank Transfer
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Payment Reference */}
              <div className="space-y-2">
                <Label htmlFor="reference">Payment Reference / Transaction ID</Label>
                <Input
                  id="reference"
                  placeholder="Enter your transaction reference (if uploading proof now)"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label>Payment Receipt (Image or PDF)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    onChange={handleFileSelect}
                    disabled={submitting}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {!selectedFile ? (
                      <div className="space-y-2">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                        <div className="text-sm text-muted-foreground">
                          <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                        </div>
                        <div className="text-xs text-muted-foreground">
                          JPG, PNG or PDF (max 10MB)
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <FileText className="h-10 w-10 mx-auto text-primary" />
                        <div className="text-sm font-medium">{selectedFile.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Upload Progress */}
              {uploadStatus === 'uploading' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Processing...</span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {/* Success Message */}
              {uploadStatus === 'success' && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Quote accepted and order created successfully!</span>
                </div>
              )}

              {/* Error Message */}
              {uploadStatus === 'error' && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span>Failed to process. Please try again.</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={() => setCurrentStep('address')} disabled={submitting}>
                Back to Address
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Accept Quote & Create Order
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
