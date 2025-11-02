import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ensureSignedUrl } from '@/lib/storageHelpers';

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
}

export const InvoicePreviewDialog = ({ 
  open, 
  onOpenChange, 
  orderId, 
  orderNumber 
}: InvoicePreviewDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && orderId) {
      fetchInvoice();
    }
  }, [open, orderId]);

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch invoice records for this order (prefer commercial invoice)
      const { data: invoices, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', orderId)
        .eq('invoice_type', 'commercial')
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (!invoices || invoices.length === 0) {
        // No commercial invoice found, try packing list
        const { data: packingLists, error: plError } = await supabase
          .from('invoices')
          .select('*')
          .eq('order_id', orderId)
          .eq('invoice_type', 'packing_list')
          .order('created_at', { ascending: false })
          .limit(1);

        if (plError) throw plError;

        if (!packingLists || packingLists.length === 0) {
          throw new Error('No invoices found for this order. Invoice will be generated when order is processed.');
        }

        // Use packing list
        await loadInvoicePDF(packingLists[0]);
        return;
      }

      // Use commercial invoice
      await loadInvoicePDF(invoices[0]);
      
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
      toast({
        title: "Error",
        description: "Failed to load invoice preview",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInvoicePDF = async (invoice: any) => {
    if (!invoice.file_url) {
      throw new Error('Invoice PDF not yet generated. Please contact support to request invoice generation.');
    }

    try {
      // Get signed URL for the stored PDF
      const signedUrl = await ensureSignedUrl(invoice.file_url);
      setPdfUrl(signedUrl);
    } catch (error: any) {
      // Better error message when PDF doesn't exist in storage
      if (error.message?.includes('not found')) {
        throw new Error(
          `Invoice PDF file is missing from storage. ` +
          `This invoice (${invoice.invoice_number}) needs to be regenerated. ` +
          `Please contact support with invoice number: ${invoice.invoice_number}`
        );
      }
      throw error;
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `invoice-${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Invoice Downloaded",
        description: `Invoice for ${orderNumber} has been downloaded.`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Invoice Preview - {orderNumber}</span>
            {pdfUrl && (
              <Button onClick={handleDownload} size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3">Loading invoice...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-destructive">
              <p>{error}</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title={`Invoice ${orderNumber}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>No invoice available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
