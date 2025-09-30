import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

interface SimpleQuoteUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteNumber: string;
  onSuccess: () => void;
}

export function SimpleQuoteUpload({ open, onOpenChange, quoteId, quoteNumber, onSuccess }: SimpleQuoteUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFilesChange = (files: File[]) => {
    if (files.length > 0) {
      setUploadedFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Generate unique filename
      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `${quoteNumber}-supplier-${Date.now()}.${fileExt}`;
      const filePath = `supplier-quotes/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('quotes')
        .upload(filePath, uploadedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('quotes')
        .getPublicUrl(filePath);

      // Update quote with file URL
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          file_url: publicUrl,
          supplier_quote_uploaded_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Supplier quote uploaded successfully',
      });

      onSuccess();
      onOpenChange(false);
      setUploadedFile(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload quote',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Supplier Quote</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Quote Number</p>
            <p className="font-medium">{quoteNumber}</p>
          </div>

          <FileUpload
            onFilesChange={handleFilesChange}
            maxFiles={1}
            maxSize={50 * 1024 * 1024}
            acceptedFileTypes={['application/pdf']}
          />

          <Button 
            onClick={handleUpload} 
            disabled={!uploadedFile || uploading} 
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Supplier Quote'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
