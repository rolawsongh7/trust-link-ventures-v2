import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, Loader2 } from 'lucide-react';
import { ensureSignedUrl } from '@/lib/storageHelpers';
import { useToast } from '@/hooks/use-toast';

interface CustomerQuotePDFDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: {
    quote_number: string;
    final_file_url?: string;
    status: string;
  } | null;
}

export const CustomerQuotePDFDialog: React.FC<CustomerQuotePDFDialogProps> = ({
  open,
  onOpenChange,
  quote
}) => {
  const { toast } = useToast();
  const [secureUrl, setSecureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSecureUrl = async () => {
      if (!quote?.final_file_url || !open) {
        setSecureUrl(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const url = await ensureSignedUrl(quote.final_file_url);
        setSecureUrl(url);
      } catch (error) {
        console.error('Error loading secure URL:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load PDF. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSecureUrl();
  }, [quote?.final_file_url, open, toast]);

  const handleDownload = async () => {
    if (!secureUrl) return;

    try {
      const response = await fetch(secureUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote?.quote_number || 'quote'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: `Downloading ${quote?.quote_number || 'quote'}`,
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not download PDF. Please try again.",
      });
    }
  };

  const handleOpenInNewTab = () => {
    if (secureUrl) {
      window.open(secureUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Quote Preview - {quote?.quote_number || 'Quote'}</DialogTitle>
          <DialogDescription>
            View your quote details. Download or open in a new tab for better viewing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-muted/30">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          ) : secureUrl ? (
            <iframe
              src={secureUrl}
              className="w-full h-full"
              title="Quote Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">Quote PDF not available</p>
                <p className="text-sm text-muted-foreground">
                  The PDF may still be generating. Please try again in a moment.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between items-center gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleOpenInNewTab}
              disabled={!secureUrl || loading}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in New Tab
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!secureUrl || loading}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
          
          <Button
            variant="default"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
