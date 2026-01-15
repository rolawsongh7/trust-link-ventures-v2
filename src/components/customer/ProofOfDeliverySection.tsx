import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, CheckCircle2, FileSignature, Calendar } from 'lucide-react';
import { format } from 'date-fns';

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
  
  if (!hasProof) return null;

  const photoUrl = deliveryProofUrl || proofOfDeliveryUrl;

  if (compact) {
    return (
      <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-900/20 space-y-2">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">Proof of Delivery</span>
        </div>
        <div className="flex items-center gap-3">
          {photoUrl && (
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
              />
            </a>
          )}
          {deliverySignature && (
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Signature</p>
              <img 
                src={deliverySignature} 
                alt="Delivery signature" 
                className="h-10 bg-white rounded border p-1"
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
    <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
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
            <a 
              href={photoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden border bg-white hover:opacity-90 transition-opacity max-w-sm"
            >
              <img 
                src={photoUrl} 
                alt="Delivery proof" 
                className="w-full max-h-64 object-cover"
              />
            </a>
          </div>
        )}

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
