import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: { orderId, type: 'commercial' }
      });

      if (error) throw error;

      if (data?.pdf) {
        const blob = new Blob([Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0))], { 
          type: 'application/pdf' 
        });
        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);
      } else {
        throw new Error('No PDF data received');
      }
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
