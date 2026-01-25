import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle2, FileSignature, Calendar, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ensureSignedUrl } from '@/lib/storageHelpers';
import { toast } from 'sonner';

interface ProofOfDeliverySectionProps {
  deliveryProofUrl?: string | null;
  proofOfDeliveryUrl?: string | null;
  deliverySignature?: string | null;
  deliveredAt?: string | null;
  compact?: boolean;
}

export const ProofOfDeliverySection: React.FC<ProofOfDeliverySectionProps> = ({
  deliveryProofUrl,
  proofOfDeliveryUrl,
  deliverySignature,
  deliveredAt,
  compact = false
}) => {
  const hasProof = deliveryProofUrl || proofOfDeliveryUrl || deliverySignature;
  const [isDownloading, setIsDownloading] = useState(false);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  
  const rawPhotoUrl = deliveryProofUrl || proofOfDeliveryUrl;

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

  const handleDownload = async () => {
    if (!rawPhotoUrl) return;
    
    setIsDownloading(true);
    try {
      const signedUrl = await ensureSignedUrl(rawPhotoUrl);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download proof of delivery');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!hasProof) return null;

  const photoUrl = signedPhotoUrl || rawPhotoUrl;

  if (compact) {
    return (
      <div className="border rounded-lg p-3 bg-[hsl(var(--tl-success-bg))] dark:bg-[hsl(var(--tl-success))]/10 space-y-2">
        <div className="flex items-center gap-2 text-[hsl(var(--tl-success-text))] dark:text-[hsl(var(--tl-success))]">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">Proof of Delivery</span>
        </div>
        <div className="flex items-center gap-3">
          {photoUrl && (
            isLoadingUrl ? (
              <div className="w-16 h-16 rounded-lg border flex items-center justify-center bg-muted">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <a 
                href={photoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-16 h-16 rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
              >
                <img 
                  src={photoUrl} 
                  alt="Delivery proof" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Image failed to load:', photoUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </a>
            )
          )}
          {deliverySignature && (
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Signature</p>
              <img 
                src={deliverySignature} 
                alt="Delivery signature" 
                className="h-10 bg-background rounded border p-1"
              />
            </div>
          )}
        </div>
        {deliveredAt && (
          <p className="text-xs text-muted-foreground">
            Delivered {format(new Date(deliveredAt), 'PPp')}
          </p>
        )}
      </div>
    );
  }

  return (
    <Card className="border-[hsl(var(--tl-success))]/30 bg-[hsl(var(--tl-success-bg))] dark:bg-[hsl(var(--tl-success))]/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[hsl(var(--tl-success-text))] dark:text-[hsl(var(--tl-success))]">
          <CheckCircle2 className="h-5 w-5" />
          Proof of Delivery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {photoUrl && (
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Camera className="h-4 w-4" />
              <span>Delivery Photo</span>
            </div>
            <div className="flex items-start gap-4">
              {isLoadingUrl ? (
                <div className="w-64 h-48 rounded-lg border flex items-center justify-center bg-muted">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <a 
                  href={photoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block rounded-lg overflow-hidden border bg-background hover:opacity-90 transition-opacity max-w-sm"
                >
                  <img 
                    src={photoUrl} 
                    alt="Delivery proof" 
                    className="w-full max-h-64 object-cover"
                    onError={(e) => {
                      console.error('Image failed to load:', photoUrl);
                      e.currentTarget.parentElement!.innerHTML = '<div class="p-4 text-sm text-muted-foreground">Failed to load image</div>';
                    }}
                  />
                </a>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownload}
                disabled={isDownloading || isLoadingUrl}
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? 'Opening...' : 'Download'}
              </Button>
            </div>
          </div>
        )}

        {deliverySignature && (
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <FileSignature className="h-4 w-4" />
              <span>Signature</span>
            </div>
            <div className="inline-block bg-background rounded-lg border p-3">
              <img 
                src={deliverySignature} 
                alt="Delivery signature" 
                className="max-h-24"
              />
            </div>
          </div>
        )}

        {deliveredAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Calendar className="h-4 w-4" />
            <span>Delivered on {format(new Date(deliveredAt), 'PPPP \'at\' p')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
