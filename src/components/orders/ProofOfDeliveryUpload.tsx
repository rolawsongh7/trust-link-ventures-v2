import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Image, FileText, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProofOfDeliveryUploadProps {
  orderId: string;
  orderNumber: string;
  onUploadComplete: (url: string) => void;
  existingUrl?: string;
  required?: boolean;
}

export const ProofOfDeliveryUpload: React.FC<ProofOfDeliveryUploadProps> = ({
  orderId,
  orderNumber,
  onUploadComplete,
  existingUrl,
  required = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(existingUrl || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl || null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image or PDF.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}-pod-${Date.now()}.${fileExt}`;
      const filePath = `proof-of-delivery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('order-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('order-documents')
        .createSignedUrl(filePath, 31536000); // 1 year

      if (urlError) throw urlError;

      const url = signedUrlData.signedUrl;
      setUploadedUrl(url);
      setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : url);
      onUploadComplete(url);
      toast.success('Proof of delivery uploaded');
    } catch (error: any) {
      console.error('POD upload error:', error);
      toast.error(error.message || 'Failed to upload proof of delivery');
    } finally {
      setUploading(false);
    }
  }, [orderId, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const clearUpload = () => {
    setUploadedUrl(null);
    setPreviewUrl(null);
    onUploadComplete('');
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        Proof of Delivery
        {required && <span className="text-destructive">*</span>}
      </Label>
      
      {uploadedUrl ? (
        <div className="relative border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-3">
            {previewUrl?.includes('.pdf') ? (
              <FileText className="h-10 w-10 text-primary" />
            ) : (
              <div className="relative h-16 w-16 rounded overflow-hidden">
                <img
                  src={previewUrl || uploadedUrl}
                  alt="Proof of delivery"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Proof uploaded
              </p>
              <p className="text-xs text-muted-foreground">
                Order {orderNumber}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearUpload}
              className="absolute top-2 right-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50',
            uploading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {isDragActive ? 'Drop file here' : 'Upload proof of delivery'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Drag & drop or click to select (Image or PDF, max 10MB)
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
