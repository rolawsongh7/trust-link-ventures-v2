import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    customer_id?: string;
    status?: string;
    customers?: {
      email?: string;
      contact_name?: string;
      company_name?: string;
    };
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

  const handleSendQuote = async () => {
    try {
      setApproving(true);

      // If PDF doesn't exist, generate it first
      if (!quote.final_file_url) {
        toast({
          title: 'Generating PDF...',
          description: 'Creating quote PDF before sending'
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

      // Get and validate customer email
      let customerEmail = quote.customer_email;
      let customerName = quote.customers?.contact_name;
      let companyName = quote.customers?.company_name;

      if (!customerEmail && quote.customer_id) {
        // Fetch from customers table if not in quote
        const { data: quoteData } = await supabase
          .from('quotes')
          .select('customers(email, contact_name, company_name)')
          .eq('id', quote.id)
          .single();
        
        customerEmail = quoteData?.customers?.email;
        customerName = quoteData?.customers?.contact_name;
        companyName = quoteData?.customers?.company_name;
      }

      if (!customerEmail) {
        throw new Error('Customer email not found. Please add a customer email before sending.');
      }

      // Update quote status to sent (admin approval tracked via approved_by/approved_at)
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ 
          status: 'sent',
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
          sent_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      // Generate proforma invoice
      toast({
        title: 'Generating proforma invoice...',
        description: 'Creating proforma invoice for the quote.'
      });

      const { error: proformaError } = await supabase.functions.invoke('generate-proforma-invoice', {
        body: { quoteId: quote.id }
      });

      if (proformaError) {
        console.error('Proforma invoice generation error:', proformaError);
        // Don't fail the entire process if proforma generation fails
        toast({
          title: 'Warning',
          description: 'Quote sent successfully, but proforma invoice generation failed. You can regenerate it later.',
          variant: 'default'
        });
      }

      // Send emails to customer and admin
      toast({
        title: 'Sending emails...',
        description: 'Sending quote to customer and admin copy.'
      });

      const { error: emailError } = await supabase.functions.invoke('send-quote-email', {
        body: {
          quoteId: quote.id,
          customerEmail: customerEmail,
          customerName: customerName,
          companyName: companyName
        }
      });

      if (emailError) {
        console.error('Email sending error:', emailError);
        throw new Error(`Failed to send emails: ${emailError.message}`);
      }

      toast({
        title: 'Quote sent successfully',
        description: `Quote sent to ${customerEmail} with PDF attachment. Copy sent to admin.`
      });

      onSuccess();
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('Error sending quote:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send quote',
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
          <DialogTitle>Send Quote - {quote.quote_number}</DialogTitle>
          <DialogDescription>
            Review the quote and send it to the customer for acceptance.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 border rounded-lg bg-muted/30">
          <div className="min-h-[calc(90vh-200px)]">
            {quote.final_file_url ? (
              <iframe
                src={`${quote.final_file_url}#view=FitH`}
                className="w-full h-full min-h-[calc(90vh-200px)]"
                title="Quote Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <p className="text-muted-foreground">No quote file available</p>
              </div>
            )}
          </div>
        </ScrollArea>

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
              onClick={() => onOpenChange(false)}
              disabled={approving}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSendQuote}
              disabled={approving}
            >
              <Check className="mr-2 h-4 w-4" />
              Send Quote to Customer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
