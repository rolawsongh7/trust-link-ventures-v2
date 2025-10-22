import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ensureSignedUrl } from '@/lib/storageHelpers';

interface PaymentReceiptPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    order_number: string;
    payment_reference?: string;
    payment_proof_url?: string;
  } | null;
}

export const PaymentReceiptPreviewDialog: React.FC<PaymentReceiptPreviewDialogProps> = ({
  open,
  onOpenChange,
  order,
}) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadFile = async () => {
      if (!order?.payment_proof_url) {
        setFileUrl(null);
        setFileType(null);
        return;
      }

      setLoading(true);
      try {
        const signedUrl = await ensureSignedUrl(order.payment_proof_url);
        
        // Detect file type from extension
        const url = order.payment_proof_url.toLowerCase();
        if (url.includes('.pdf')) {
          setFileType('pdf');
        } else if (url.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          setFileType('image');
        } else {
          // Default to PDF if unclear
          setFileType('pdf');
        }
        
        setFileUrl(signedUrl);
      } catch (error) {
        console.error('Error loading receipt:', error);
        toast({
          title: 'Error',
          description: 'Failed to load payment receipt',
          variant: 'destructive',
        });
        setFileUrl(null);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      loadFile();
    } else {
      setFileUrl(null);
      setFileType(null);
    }
  }, [open, order, toast]);

  const handleDownload = async () => {
    if (!fileUrl || !order) return;

    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Determine file extension
      const extension = fileType === 'pdf' ? 'pdf' : 'jpg';
      a.download = `payment-receipt-${order.order_number}.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'Payment receipt downloaded successfully',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Error',
        description: 'Failed to download receipt',
        variant: 'destructive',
      });
    }
  };

  const handleOpenNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Payment Receipt - {order?.order_number}
          </DialogTitle>
          <DialogDescription>
            {order?.payment_reference && `Reference: ${order.payment_reference}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : fileUrl ? (
            <div className="flex-1 border rounded-lg overflow-hidden bg-muted/30">
              {fileType === 'pdf' ? (
                <iframe
                  src={fileUrl}
                  className="w-full h-full"
                  title="Payment Receipt PDF"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                  <img
                    src={fileUrl}
                    alt="Payment Receipt"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>No receipt available for preview</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {fileUrl && (
              <>
                <Button variant="outline" onClick={handleOpenNewTab}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
