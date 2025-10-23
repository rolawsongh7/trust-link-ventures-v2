import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LeadSubmissionData {
  title: string;
  description?: string;
  source?: string;
  customer_id?: string;
  status?: string;
  value?: number;
  currency?: string;
  recaptchaToken?: string;
}

interface UseLeadSubmissionReturn {
  submitLead: (data: LeadSubmissionData) => Promise<{ success: boolean; lead_id?: string }>;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * Hook to submit leads through the secure submit-lead edge function
 * This ensures all leads go through proper validation, rate limiting, and bot detection
 */
export const useLeadSubmission = (): UseLeadSubmissionReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLead = async (data: LeadSubmissionData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: responseData, error: submitError } = await supabase.functions.invoke('submit-lead', {
        body: {
          title: data.title,
          description: data.description,
          source: data.source || 'website',
          customer_id: data.customer_id,
          status: data.status || 'new',
          value: data.value,
          currency: data.currency || 'USD',
          recaptchaToken: data.recaptchaToken
        }
      });

      if (submitError) {
        console.error('Error submitting lead:', submitError);
        const errorMessage = submitError.message || 'Failed to submit lead. Please try again.';
        setError(errorMessage);
        toast.error(errorMessage);
        return { success: false };
      }

      if (!responseData?.success) {
        const errorMessage = responseData?.error || 'Failed to submit lead. Please try again.';
        setError(errorMessage);
        toast.error(errorMessage);
        return { success: false };
      }

      toast.success(responseData.message || 'Lead submitted successfully!');
      return { success: true, lead_id: responseData.lead_id };

    } catch (err: any) {
      console.error('Unexpected error submitting lead:', err);
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitLead,
    isSubmitting,
    error
  };
};
