import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  RefreshCw,
  Calendar,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { format } from 'date-fns';

interface RegenerationResult {
  success: boolean;
  invoice_count: number;
  invoice_ids: string[];
  initiated_at: string;
}

export const BulkPdfRegenerationCard = () => {
  const { hasSuperAdminAccess } = useRoleAuth();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<RegenerationResult | null>(null);

  const initiateRegeneration = async () => {
    if (!hasSuperAdminAccess) return;
    if (!startDate || !endDate) {
      toast({
        title: 'Date Range Required',
        description: 'Please select both start and end dates.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('regenerate_invoice_pdfs', {
        p_start_date: startDate,
        p_end_date: endDate
      });
      
      if (error) throw error;
      
      const resultData = data as unknown as RegenerationResult;
      setResult(resultData);
      
      if (resultData.invoice_count === 0) {
        toast({
          title: 'No Invoices Found',
          description: 'No invoices found in the selected date range.',
        });
        return;
      }
      
      // Start the regeneration process
      await processRegeneration(resultData.invoice_ids);
      
    } catch (error: any) {
      console.error('Failed to initiate regeneration:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate PDF regeneration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const processRegeneration = async (invoiceIds: string[]) => {
    setRegenerating(true);
    setProgress(0);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < invoiceIds.length; i++) {
      try {
        // Call the invoice generation edge function for each invoice
        const { error } = await supabase.functions.invoke('generate-invoice-pdf', {
          body: { invoiceId: invoiceIds[i], regenerate: true }
        });
        
        if (error) {
          failCount++;
          console.error(`Failed to regenerate invoice ${invoiceIds[i]}:`, error);
        } else {
          successCount++;
        }
      } catch (err) {
        failCount++;
        console.error(`Error regenerating invoice ${invoiceIds[i]}:`, err);
      }
      
      setProgress(Math.round(((i + 1) / invoiceIds.length) * 100));
    }
    
    setRegenerating(false);
    
    toast({
      title: 'Regeneration Complete',
      description: `Successfully regenerated ${successCount} invoices. ${failCount > 0 ? `${failCount} failed.` : ''}`,
      variant: failCount > 0 ? 'destructive' : 'default',
    });
  };

  if (!hasSuperAdminAccess) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bulk PDF Regeneration
        </CardTitle>
        <CardDescription>
          Regenerate invoice PDFs for a date range. Use when templates change or storage issues occur.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This operation may take time depending on the number of invoices. 
            Existing PDFs will be replaced.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading || regenerating}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={loading || regenerating}
              />
            </div>
          </div>
        </div>

        {regenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Regenerating PDFs...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {result && !regenerating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Last run: {format(new Date(result.initiated_at), 'PPp')} - {result.invoice_count} invoices processed
          </div>
        )}

        <Button
          onClick={initiateRegeneration}
          disabled={loading || regenerating || !startDate || !endDate}
          className="w-full"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Preparing...
            </>
          ) : regenerating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Regenerating... ({progress}%)
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Start Regeneration
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
