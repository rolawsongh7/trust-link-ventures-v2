import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, X, ExternalLink } from 'lucide-react';

interface QuotePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: {
    id: string;
    quote_number: string;
    final_file_url?: string;
    customer_email?: string;
    status?: string;
  };
  onSuccess: () => void;
}

export const QuotePreviewDialog: React.FC<QuotePreviewDialogProps> = ({
  open,
  onOpenChange,
  quote,
  onSuccess
}) => {
  const { toast } = useToast();
  const [approving, setApproving] = React.useState(false);

  const handleApprove = async () => {
    try {
      setApproving(true);

      // If PDF doesn't exist, generate it first
      if (!quote.final_file_url) {
        toast({
          title: 'Generating PDF...',
          description: 'Creating quote PDF before approval'
        });

        const { error: generateError } = await supabase.functions.invoke('generate-quote-title-page', {
          body: { quoteId: quote.id }
        });

        if (generateError) {
          throw new Error('Failed to generate PDF: ' + generateError.message);
        }

        // Wait a moment for the PDF to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Update quote status to approved
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ 
          status: 'approved',
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      toast({
        title: 'Quote approved',
        description: 'Quote has been approved. You can now send it to the customer.'
      });

      onSuccess();
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('Error approving quote:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve quote',
        variant: 'destructive'
      });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      // Update quote status back to draft
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ 
          status: 'draft',
          final_file_url: null
        })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      toast({
        title: 'Quote rejected',
        description: 'Quote has been set back to draft. You can make changes and regenerate.'
      });

      onSuccess();
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('Error rejecting quote:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject quote',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review Quote - {quote.quote_number}</DialogTitle>
          <DialogDescription>
            Preview the generated quote before sending it to the customer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-muted/30">
          {quote.final_file_url ? (
            <iframe
              src={quote.final_file_url}
              className="w-full h-full"
              title="Quote Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No quote file available</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between items-center">
          <Button
            variant="outline"
            onClick={() => window.open(quote.final_file_url, '_blank')}
            disabled={!quote.final_file_url}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in New Tab
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={approving}
            >
              <X className="mr-2 h-4 w-4" />
              Reject & Edit
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving}
            >
              <Check className="mr-2 h-4 w-4" />
              Approve Quote
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
