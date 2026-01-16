import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useToast } from '@/hooks/use-toast';

export type RevisionStatus = 'submitted' | 'reviewing' | 'revised_sent' | 'resolved' | 'rejected';
export type RequestType = 'quantity_change' | 'swap_items' | 'delivery_change' | 'other';

export interface QuoteRevision {
  id: string;
  quote_id: string;
  customer_id: string;
  requested_by_user_id?: string;
  status: RevisionStatus;
  request_type: RequestType;
  requested_changes: Record<string, unknown>;
  customer_note?: string;
  admin_note?: string;
  revision_number: number;
  created_at: string;
  updated_at: string;
}

interface QuantityChange {
  item_id: string;
  product_name: string;
  original_quantity: number;
  requested_quantity: number;
  unit: string;
}

interface SwapItem {
  original_item_id: string;
  original_product_name: string;
  new_product_id?: string;
  new_product_name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface DeliveryChange {
  new_delivery_date?: string;
  delivery_notes?: string;
}

export interface RevisionRequest {
  request_type: RequestType;
  quantity_changes?: QuantityChange[];
  swap_items?: SwapItem[];
  delivery_change?: DeliveryChange;
  other_notes?: string;
  customer_note?: string;
}

interface UseQuoteRevisionsReturn {
  revisions: QuoteRevision[];
  loading: boolean;
  submitting: boolean;
  fetchRevisions: (quoteId: string) => Promise<void>;
  submitRevisionRequest: (quoteId: string, request: RevisionRequest) => Promise<boolean>;
  cancelRevision: (revisionId: string) => Promise<boolean>;
  getActiveRevision: (quoteId: string) => QuoteRevision | undefined;
}

export const useQuoteRevisions = (): UseQuoteRevisionsReturn => {
  const { profile } = useCustomerAuth();
  const { toast } = useToast();
  const [revisions, setRevisions] = useState<QuoteRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchRevisions = useCallback(async (quoteId: string) => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      // Get customer_id from customer_users mapping
      const { data: customerMapping } = await supabase
        .from('customer_users')
        .select('customer_id')
        .eq('user_id', profile.id)
        .single();

      if (!customerMapping?.customer_id) {
        console.error('No customer mapping found');
        return;
      }

      const { data, error } = await supabase
        .from('quote_revisions')
        .select('*')
        .eq('quote_id', quoteId)
        .order('revision_number', { ascending: false });

      if (error) throw error;
      
      // Cast the data to match our interface
      setRevisions((data || []).map(rev => ({
        ...rev,
        status: rev.status as RevisionStatus,
        request_type: rev.request_type as RequestType,
        requested_changes: rev.requested_changes as Record<string, unknown>,
      })));
    } catch (error) {
      console.error('Error fetching revisions:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  const submitRevisionRequest = useCallback(async (
    quoteId: string, 
    request: RevisionRequest
  ): Promise<boolean> => {
    if (!profile?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please sign in to request changes.",
      });
      return false;
    }

    try {
      setSubmitting(true);

      // Get customer_id from customer_users mapping
      const { data: customerMapping } = await supabase
        .from('customer_users')
        .select('customer_id')
        .eq('user_id', profile.id)
        .single();

      if (!customerMapping?.customer_id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Customer account not found.",
        });
        return false;
      }

      // Build requested_changes JSON
      const requestedChanges: Record<string, unknown> = {};
      
      if (request.quantity_changes) {
        requestedChanges.quantity_changes = request.quantity_changes;
      }
      if (request.swap_items) {
        requestedChanges.swap_items = request.swap_items;
      }
      if (request.delivery_change) {
        requestedChanges.delivery_change = request.delivery_change;
      }
      if (request.other_notes) {
        requestedChanges.other_notes = request.other_notes;
      }

      const { error } = await supabase
        .from('quote_revisions')
        .insert([{
          quote_id: quoteId,
          customer_id: customerMapping.customer_id,
          requested_by_user_id: profile.id,
          request_type: request.request_type,
          requested_changes: requestedChanges,
          customer_note: request.customer_note || null,
          status: 'submitted',
        }]);

      if (error) throw error;

      toast({
        title: "Change request submitted",
        description: "We'll review your request and get back to you shortly.",
      });

      // Refresh revisions
      await fetchRevisions(quoteId);
      
      return true;
    } catch (error) {
      console.error('Error submitting revision request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit change request. Please try again.",
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [profile?.id, toast, fetchRevisions]);

  const cancelRevision = useCallback(async (revisionId: string): Promise<boolean> => {
    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('quote_revisions')
        .update({ status: 'rejected' })
        .eq('id', revisionId)
        .eq('status', 'submitted');

      if (error) throw error;

      toast({
        title: "Request cancelled",
        description: "Your change request has been cancelled.",
      });

      // Update local state
      setRevisions(prev => 
        prev.map(rev => 
          rev.id === revisionId 
            ? { ...rev, status: 'rejected' as RevisionStatus } 
            : rev
        )
      );

      return true;
    } catch (error) {
      console.error('Error cancelling revision:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel request. Please try again.",
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [toast]);

  const getActiveRevision = useCallback((quoteId: string): QuoteRevision | undefined => {
    return revisions.find(
      rev => rev.quote_id === quoteId && 
      ['submitted', 'reviewing'].includes(rev.status)
    );
  }, [revisions]);

  return {
    revisions,
    loading,
    submitting,
    fetchRevisions,
    submitRevisionRequest,
    cancelRevision,
    getActiveRevision,
  };
};
