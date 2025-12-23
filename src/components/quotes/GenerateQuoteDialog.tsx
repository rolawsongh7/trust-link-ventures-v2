import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2 } from 'lucide-react';

interface GenerateQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: {
    id: string;
    quote_number: string;
    customer_id?: string;
    total_amount?: number;
  };
  onSuccess: () => void;
}

export const GenerateQuoteDialog: React.FC<GenerateQuoteDialogProps> = ({
  open,
  onOpenChange,
  quote,
  onSuccess
}) => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!quote.customer_id) {
      toast({
        title: 'Missing customer',
        description: 'Please select a customer for this quote first',
        variant: 'destructive'
      });
      return;
    }

    if (!quote.total_amount || quote.total_amount === 0) {
      toast({
        title: 'No items',
        description: 'Please add items to the quote before generating',
        variant: 'destructive'
      });
      return;
    }

    try {
      setGenerating(true);

      const { data, error: generateError } = await supabase.functions.invoke(
        'generate-quote-title-page',
        {
          body: {
            quoteId: quote.id
          }
        }
      );

      if (generateError) throw generateError;

      toast({
        title: 'Quote generated',
        description: 'Quote has been generated and is ready for review'
      });

      onSuccess();
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('Error generating quote:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate quote',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Quote - {quote.quote_number}</DialogTitle>
          <DialogDescription>
            This will create a formal quote PDF with all details from your quote items, customer information, and company details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
            <h4 className="font-semibold text-sm">The quote will include:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground ml-4 list-disc">
              <li>Trust Link Ventures company information and logo</li>
              <li>Quote number and dates</li>
              <li>Customer billing information</li>
              <li>Delivery information (if available)</li>
              <li>Detailed items table with pricing</li>
              <li>Terms and conditions</li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              After generation, the quote will be set to "Pending Review" status. You can preview it before sending to the customer.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={generating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Quote
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
