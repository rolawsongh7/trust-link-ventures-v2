import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, FileImage, FileText, ExternalLink, AlertCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { usePaymentProofUrl } from '@/hooks/usePaymentProofUrl';
import { getPaymentTypeLabel } from '@/types/payment';

interface PaymentProofViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proofUrl: string | null;
  paymentType: string;
  paymentDate: string;
}

export const PaymentProofViewerDialog = ({
  open,
  onOpenChange,
  proofUrl,
  paymentType,
  paymentDate,
}: PaymentProofViewerDialogProps) => {
  const { signedUrl, loading, error, refreshUrl } = usePaymentProofUrl(proofUrl);
  const [zoom, setZoom] = useState(1);

  // Fetch signed URL when dialog opens
  useEffect(() => {
    if (open && proofUrl) {
      refreshUrl();
      setZoom(1); // Reset zoom on open
    }
  }, [open, proofUrl, refreshUrl]);

  const isPdf = proofUrl?.toLowerCase().includes('.pdf');

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  const handleOpenInNewTab = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {isPdf ? (
              <FileText className="h-5 w-5 text-red-500" />
            ) : (
              <FileImage className="h-5 w-5 text-blue-500" />
            )}
            <span>{getPaymentTypeLabel(paymentType as any)} Payment Proof</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Uploaded: {new Date(paymentDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading proof...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Failed to load proof</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <Button variant="outline" onClick={refreshUrl} className="mt-2">
                Try Again
              </Button>
            </div>
          ) : signedUrl ? (
            isPdf ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <FileText className="h-16 w-16 text-red-500" />
                <p className="text-sm text-muted-foreground">PDF Document</p>
                <Button onClick={handleOpenInNewTab} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open PDF in New Tab
                </Button>
              </div>
            ) : (
              <div className="relative">
                {/* Zoom controls */}
                <div className="sticky top-0 z-10 flex justify-end gap-2 pb-2 bg-background">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground self-center min-w-[4rem] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                {/* Image viewer */}
                <div className="overflow-auto max-h-[60vh] border rounded-lg bg-muted/30">
                  <img
                    src={signedUrl}
                    alt="Payment proof"
                    className="mx-auto transition-transform duration-200"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                    onError={() => {
                      console.error('[PaymentProofViewer] Image failed to load');
                    }}
                  />
                </div>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No proof available</p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            This is a secure, read-only view. The link expires in 10 minutes.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
