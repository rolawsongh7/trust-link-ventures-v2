import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/ui/file-upload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Link as LinkIcon, CheckCircle } from 'lucide-react';

interface QuoteRequest {
  id: string;
  quote_number: string | null;
  title: string;
  lead_company_name: string | null;
  lead_contact_name: string | null;
  status: string;
}

interface QuoteUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export default function QuoteUploadDialog({ open, onOpenChange, onUploadComplete }: QuoteUploadDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'link' | 'complete'>('upload');
  const [uploading, setUploading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [quoteId, setQuoteId] = useState<string>('');
  const [quoteNumber, setQuoteNumber] = useState<string>('');

  useEffect(() => {
    if (open && step === 'link') {
      fetchPendingRequests();
    }
  }, [open, step]);

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuoteRequests(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleFilesChange = (files: File[]) => {
    if (files.length > 0) {
      setUploadedFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Generate unique filename
      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `supplier-quotes/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('quotes')
        .upload(filePath, uploadedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('quotes')
        .getPublicUrl(filePath);

      // Create quote record
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          quote_number: `Q-${Date.now().toString().slice(-6)}`,
          title: 'Supplier Quote - ' + uploadedFile.name,
          file_url: publicUrl,
          status: 'draft',
          supplier_quote_uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      setUploadedFileUrl(publicUrl);
      setQuoteId(quote.id);
      setQuoteNumber(quote.quote_number);
      setStep('link');

      toast({
        title: 'Success',
        description: 'Quote uploaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLink = async () => {
    if (!selectedRequestId) {
      toast({
        title: 'Error',
        description: 'Please select a quote request',
        variant: 'destructive',
      });
      return;
    }

    setLinking(true);
    try {
      const selectedRequest = quoteRequests.find(r => r.id === selectedRequestId);
      
      // Use the database function to link quote to request
      const { data, error } = await supabase.rpc('link_quote_to_request', {
        p_quote_id: quoteId,
        p_quote_number: selectedRequest?.quote_number || ''
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to link quote');
      }

      setStep('complete');
      toast({
        title: 'Success',
        description: 'Quote linked to request successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLinking(false);
    }
  };

  const handleComplete = () => {
    onUploadComplete();
    onOpenChange(false);
    // Reset state
    setStep('upload');
    setUploadedFile(null);
    setUploadedFileUrl('');
    setQuoteId('');
    setQuoteNumber('');
    setSelectedRequestId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Supplier Quote</DialogTitle>
          <DialogDescription>
            Upload a quote from a supplier and link it to a customer request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step !== 'upload' ? 'bg-primary border-primary text-primary-foreground' : 'border-current'}`}>
                {step !== 'upload' ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <span className="font-medium">Upload</span>
            </div>
            <div className="flex-1 h-0.5 bg-border mx-2" />
            <div className={`flex items-center gap-2 ${step === 'link' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'complete' ? 'bg-primary border-primary text-primary-foreground' : 'border-current'}`}>
                {step === 'complete' ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <span className="font-medium">Link</span>
            </div>
            <div className="flex-1 h-0.5 bg-border mx-2" />
            <div className={`flex items-center gap-2 ${step === 'complete' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'complete' ? 'bg-primary border-primary text-primary-foreground' : 'border-current'}`}>
                {step === 'complete' ? <CheckCircle className="w-5 h-5" /> : '3'}
              </div>
              <span className="font-medium">Complete</span>
            </div>
          </div>

          {/* Step content */}
          {step === 'upload' && (
            <div className="space-y-4">
              <FileUpload
                onFilesChange={handleFilesChange}
                maxFiles={1}
                maxSize={50 * 1024 * 1024}
                acceptedFileTypes={['application/pdf']}
              />
              <Button onClick={handleUpload} disabled={!uploadedFile || uploading} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Quote'}
              </Button>
            </div>
          )}

          {step === 'link' && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Uploaded Quote</p>
                <p className="font-medium">{quoteNumber}</p>
              </div>

              <div className="space-y-2">
                <Label>Link to Quote Request</Label>
                <Select value={selectedRequestId} onValueChange={setSelectedRequestId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a quote request" />
                  </SelectTrigger>
                  <SelectContent>
                    {quoteRequests.map((request) => (
                      <SelectItem key={request.id} value={request.id}>
                        {request.quote_number} - {request.title}
                        {request.lead_company_name && ` (${request.lead_company_name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setStep('upload')} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleLink} disabled={!selectedRequestId || linking} className="flex-1">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  {linking ? 'Linking...' : 'Link Quote'}
                </Button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="space-y-4 text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Quote Uploaded Successfully</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Your supplier quote has been uploaded and linked to the customer request.
                  You can now generate the title page and send it to the customer.
                </p>
              </div>
              <Button onClick={handleComplete} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
