import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { suppliers } from '@/data/suppliers';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GenerateTitlePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: {
    id: string;
    quote_number: string;
  };
  customers: Array<{
    id: string;
    company_name: string;
    contact_name?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
  }>;
  onSuccess: () => void;
}

export const GenerateTitlePageDialog: React.FC<GenerateTitlePageDialogProps> = ({
  open,
  onOpenChange,
  quote,
  customers,
  onSuccess
}) => {
  const { toast } = useToast();
  const [validUntil, setValidUntil] = useState<Date>();
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a PDF file',
          variant: 'destructive'
        });
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleGenerate = async () => {
    if (!validUntil || !selectedSupplier || !selectedCustomer || !uploadedFile) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields and upload a supplier quote',
        variant: 'destructive'
      });
      return;
    }

    try {
      setGenerating(true);

      // 1. Upload supplier quote
      const fileExt = 'pdf';
      const fileName = `${quote.quote_number}-supplier-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('quotes')
        .upload(filePath, uploadedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('quotes')
        .getPublicUrl(filePath);

      // 2. Update quote with supplier info and valid_until
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          file_url: publicUrl,
          customer_id: selectedCustomer,
          valid_until: format(validUntil, 'yyyy-MM-dd'),
          supplier_quote_uploaded_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      // 3. Generate title page with supplier info
      const supplier = suppliers.find(s => s.id === selectedSupplier);
      const customer = customers.find(c => c.id === selectedCustomer);

      const { data, error: generateError } = await supabase.functions.invoke(
        'generate-quote-title-page',
        {
          body: {
            quoteId: quote.id,
            supplier: {
              name: supplier?.name,
              logo: supplier?.logo,
              address: supplier?.address
            },
            customer: {
              company_name: customer?.company_name,
              contact_name: customer?.contact_name,
              email: customer?.email,
              address: customer?.address,
              city: customer?.city,
              country: customer?.country
            }
          }
        }
      );

      if (generateError) throw generateError;

      toast({
        title: 'Success',
        description: 'Title page generated and appended to supplier quote'
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setValidUntil(undefined);
      setSelectedSupplier('');
      setSelectedCustomer('');
      setUploadedFile(null);
      
    } catch (error: any) {
      console.error('Error generating title page:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate title page',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate Title Page - {quote.quote_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Valid Until Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !validUntil && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {validUntil ? format(validUntil, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border shadow-md z-50" align="start">
                <Calendar
                  mode="single"
                  selected={validUntil}
                  onSelect={setValidUntil}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Select Supplier *</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Select Customer *</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Upload Supplier Quote (PDF) *</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {uploadedFile && (
                <span className="text-sm text-muted-foreground">
                  {uploadedFile.name}
                </span>
              )}
            </div>
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
            disabled={generating || !validUntil || !selectedSupplier || !selectedCustomer || !uploadedFile}
          >
            {generating ? (
              <>Generating...</>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Generate Final Quote
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
