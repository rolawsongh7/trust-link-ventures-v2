import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePaymentProofUrlResult {
  signedUrl: string | null;
  loading: boolean;
  error: string | null;
  refreshUrl: () => Promise<void>;
}

/**
 * Hook to fetch fresh signed URLs for payment proofs
 * Signed URLs expire after 10 minutes for security
 */
export const usePaymentProofUrl = (proofUrl: string | null): UsePaymentProofUrlResult => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUrl = useCallback(async () => {
    if (!proofUrl) {
      setSignedUrl(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Extract the storage path from the URL
      // The URL format is: https://{project}.supabase.co/storage/v1/object/public/payment-proofs/{path}
      // or it could be a signed URL already, or just a path
      let storagePath = proofUrl;
      
      // If it's a full URL, extract the path after the bucket name
      if (proofUrl.includes('payment-proofs/')) {
        const match = proofUrl.match(/payment-proofs\/(.+)/);
        if (match) {
          storagePath = match[1];
        }
      }

      // Remove any query parameters from the path
      storagePath = storagePath.split('?')[0];

      console.log('[PaymentProofUrl] Generating signed URL for:', storagePath);

      const { data, error: signError } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(storagePath, 600); // 10 minutes expiry

      if (signError) {
        console.error('[PaymentProofUrl] Error creating signed URL:', signError);
        throw signError;
      }

      if (data?.signedUrl) {
        setSignedUrl(data.signedUrl);
        console.log('[PaymentProofUrl] Signed URL generated successfully');
      } else {
        throw new Error('No signed URL returned');
      }
    } catch (err) {
      console.error('[PaymentProofUrl] Failed to generate signed URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to load proof');
      setSignedUrl(null);
    } finally {
      setLoading(false);
    }
  }, [proofUrl]);

  return { signedUrl, loading, error, refreshUrl };
};
