import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Camera, 
  CheckCircle2, 
  FileSignature, 
  Calendar, 
  Download, 
  RefreshCw,
  User,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ProofOfDeliveryUpload } from './ProofOfDeliveryUpload';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ensureSignedUrl } from '@/lib/storageHelpers';

interface AdminProofOfDeliverySectionProps {
  orderId: string;
  orderNumber: string;
  proofOfDeliveryUrl?: string | null;
  deliveryProofUrl?: string | null;
  deliverySignature?: string | null;
  deliveredAt?: string | null;
  deliveredBy?: string | null;
  deliveryNotes?: string | null;
  onUpdate?: () => void;
}

export const AdminProofOfDeliverySection: React.FC<AdminProofOfDeliverySectionProps> = ({
  orderId,
  orderNumber,
  proofOfDeliveryUrl,
  deliveryProofUrl,
  deliverySignature,
  deliveredAt,
  deliveredBy,
  deliveryNotes,
  onUpdate
}) => {
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  const rawPhotoUrl = proofOfDeliveryUrl || deliveryProofUrl;
  const hasPod = rawPhotoUrl || deliverySignature;

  // Get fresh signed URL on mount
  useEffect(() => {
    const loadSignedUrl = async () => {
      if (!rawPhotoUrl) return;
      
      setIsLoadingUrl(true);
      try {
        const freshUrl = await ensureSignedUrl(rawPhotoUrl);
        setSignedPhotoUrl(freshUrl);
      } catch (error) {
        console.error('Failed to get signed URL for POD:', error);
        // Fall back to raw URL
        setSignedPhotoUrl(rawPhotoUrl);
      } finally {
        setIsLoadingUrl(false);
      }
    };

    loadSignedUrl();
  }, [rawPhotoUrl]);

  const photoUrl = signedPhotoUrl || rawPhotoUrl;

  const handleDownload = async () => {
    if (!photoUrl) return;
    
    setIsDownloading(true);
    try {
      const signedUrl = await ensureSignedUrl(photoUrl);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download proof of delivery');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReplaceClick = () => {
    if (hasPod) {
      setShowReplaceConfirm(true);
    } else {
      setShowUpload(true);
    }
  };

  const handleConfirmReplace = () => {
    setShowReplaceConfirm(false);
    setShowUpload(true);
  };

  const handleUploadComplete = async (url: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          proof_of_delivery_url: url,
          delivered_by: 'admin_manual_upload'
        })
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success(hasPod ? 'Proof of delivery replaced' : 'Proof of delivery uploaded');
      setShowUpload(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating POD:', error);
      toast.error('Failed to update proof of delivery');
    }
  };

  if (!hasPod && !showUpload) {
    return (
      <Card className="border-[hsl(var(--tl-warning))]/30 bg-[hsl(var(--tl-warning-bg))] dark:bg-[hsl(var(--tl-warning))]/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[hsl(var(--tl-warning-text))] dark:text-[hsl(var(--tl-warning))] text-base">
            <AlertTriangle className="h-5 w-5" />
            No Proof of Delivery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This order does not have proof of delivery attached.
          </p>
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Camera className="h-4 w-4 mr-2" />
            Upload POD
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showUpload) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-5 w-5" />
            {hasPod ? 'Replace Proof of Delivery' : 'Upload Proof of Delivery'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProofOfDeliveryUpload
            orderId={orderId}
            orderNumber={orderNumber}
            onUploadComplete={handleUploadComplete}
            existingUrl={photoUrl || undefined}
            required={true}
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowUpload(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-[hsl(var(--tl-success))]/30 bg-[hsl(var(--tl-success-bg))] dark:bg-[hsl(var(--tl-success))]/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[hsl(var(--tl-success-text))] dark:text-[hsl(var(--tl-success))] text-base">
            <CheckCircle2 className="h-5 w-5" />
            Proof of Delivery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo Preview */}
          {rawPhotoUrl && (
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Camera className="h-4 w-4" />
                <span>Delivery Photo</span>
              </div>
              <div className="flex items-start gap-4">
                {isLoadingUrl ? (
                  <div className="w-24 h-24 rounded-lg border flex items-center justify-center bg-muted flex-shrink-0">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <a 
                    href={photoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-24 h-24 rounded-lg overflow-hidden border bg-white hover:opacity-90 transition-opacity flex-shrink-0"
                  >
                    <img 
                      src={photoUrl} 
                      alt="Delivery proof" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('POD image failed to load:', photoUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </a>
                )}
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownload}
                    disabled={isDownloading || isLoadingUrl}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isDownloading ? 'Opening...' : 'Download'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleReplaceClick}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Replace
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Signature */}
          {deliverySignature && (
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <FileSignature className="h-4 w-4" />
                <span>Signature</span>
              </div>
              <div className="inline-block bg-white rounded-lg border p-3">
                <img 
                  src={deliverySignature} 
                  alt="Delivery signature" 
                  className="max-h-16"
                />
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            {deliveredAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Delivered {format(new Date(deliveredAt), 'PPp')}</span>
              </div>
            )}
            {deliveredBy && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>By: {deliveredBy}</span>
              </div>
            )}
          </div>

          {/* Delivery Notes */}
          {deliveryNotes && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-1">Delivery Notes:</p>
              <p className="text-sm">{deliveryNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={showReplaceConfirm}
        onOpenChange={setShowReplaceConfirm}
        title="Replace Proof of Delivery?"
        description={`This will replace the existing proof of delivery for order ${orderNumber}. The previous file will be replaced and this action will be logged in the audit trail.`}
        confirmText="Replace"
        onConfirm={handleConfirmReplace}
        variant="default"
      />
    </>
  );
};
