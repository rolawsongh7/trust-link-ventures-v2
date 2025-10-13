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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CustomerPaymentProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    order_number: string;
    customer_id: string;
  };
  onSuccess: () => void;
}

export const CustomerPaymentProofDialog: React.FC<CustomerPaymentProofDialogProps> = ({
  open,
  onOpenChange,
  order,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'mobile_money'>('mobile_money');
  const [paymentReference, setPaymentReference] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a JPG, PNG, or PDF file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
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
    setErrorMessage('');
  };

  const uploadWithRetry = async (file: File, maxRetries = 3): Promise<string> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${order.customer_id}/${order.order_number}-${Date.now()}.${fileExt}`;
        
        setUploadProgress((attempt - 1) * 30);
        
        const { data, error } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;
        
        setUploadProgress(90);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName);

        setUploadProgress(100);
        return publicUrl;
      } catch (error) {
        lastError = error as Error;
        console.error(`Upload attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError || new Error('Upload failed after all retries');
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a payment receipt to upload',
        variant: 'destructive',
      });
      return;
    }

    if (!paymentReference.trim()) {
      toast({
        title: 'Payment Reference Required',
        description: 'Please enter your payment reference number',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      // Upload file with retry logic
      const publicUrl = await uploadWithRetry(selectedFile);

      // Update order with payment proof
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_proof_url: publicUrl,
          payment_reference: paymentReference,
          payment_method: paymentMethod,
          payment_proof_uploaded_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // Send notification to admin
      await supabase.functions.invoke('notify-payment-proof-uploaded', {
        body: {
          orderId: order.id,
          orderNumber: order.order_number,
          paymentMethod,
          paymentReference,
        },
      }).catch(err => {
        console.error('Notification error (non-blocking):', err);
      });

      setUploadStatus('success');
      
      toast({
        title: 'Payment Proof Uploaded',
        description: 'Your payment receipt has been submitted for verification. We will notify you once verified.',
      });

      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        resetForm();
      }, 1500);

    } catch (error: any) {
      console.error('Error uploading payment proof:', error);
      setUploadStatus('error');
      setErrorMessage(error.message || 'Failed to upload payment proof');
      
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload payment proof. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setPaymentMethod('mobile_money');
    setPaymentReference('');
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    setErrorMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Payment Proof</DialogTitle>
          <DialogDescription>
            Upload your payment receipt for order {order.order_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Method */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent">
                <RadioGroupItem value="mobile_money" id="mobile_money" />
                <Label htmlFor="mobile_money" className="flex-1 cursor-pointer">
                  Mobile Money (MTN, Vodafone, AirtelTigo)
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
              placeholder="Enter your transaction reference"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              disabled={uploading}
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
                disabled={uploading}
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
                <span className="text-muted-foreground">Uploading...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Success Message */}
          {uploadStatus === 'success' && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span>Payment proof uploaded successfully!</span>
            </div>
          )}

          {/* Error Message */}
          {uploadStatus === 'error' && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || !paymentReference.trim() || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Submit Payment Proof
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
