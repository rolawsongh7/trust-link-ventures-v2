import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Check, X, AlertCircle } from 'lucide-react';

interface BulkPriceImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ParsedRow {
  productName: string;
  unitPrice: number;
  costPrice?: number;
  priceUnit: string;
  matched: boolean;
  productId?: string;
}

export const BulkPriceImport: React.FC<BulkPriceImportProps> = ({
  open,
  onOpenChange,
  onImportComplete
}) => {
  const { user } = useAuth();
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [results, setResults] = useState<{ updated: number; failed: number }>({ updated: 0, failed: 0 });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        
        // Fetch all products for matching
        const { data: products } = await supabase
          .from('supplier_products')
          .select('id, name')
          .eq('is_active', true);

        const productMap = new Map(
          (products || []).map(p => [p.name.toLowerCase().trim(), p.id])
        );

        const parsed: ParsedRow[] = rows
          .filter(row => row['Product Name'] || row['product_name'] || row['Name'])
          .map(row => {
            const productName = (row['Product Name'] || row['product_name'] || row['Name'] || '').trim();
            const productId = productMap.get(productName.toLowerCase());
            
            return {
              productName,
              unitPrice: parseFloat(row['Unit Price'] || row['unit_price'] || row['Price'] || '0') || 0,
              costPrice: parseFloat(row['Cost Price'] || row['cost_price'] || row['Cost'] || '') || undefined,
              priceUnit: row['Unit'] || row['price_unit'] || 'kg',
              matched: !!productId,
              productId
            };
          });

        setParsedData(parsed);
        setStep('preview');
      },
      error: (error) => {
        toast.error('Failed to parse CSV: ' + error.message);
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  const handleImport = async () => {
    const matchedRows = parsedData.filter(row => row.matched && row.productId);
    if (matchedRows.length === 0) {
      toast.error('No matching products found');
      return;
    }

    setImporting(true);
    setProgress(0);

    let updated = 0;
    let failed = 0;

    for (let i = 0; i < matchedRows.length; i++) {
      const row = matchedRows[i];
      
      try {
        const { error } = await supabase
          .from('supplier_products')
          .update({
            unit_price: row.unitPrice,
            cost_price: row.costPrice || null,
            price_unit: row.priceUnit,
            last_price_update: new Date().toISOString(),
            price_updated_by: user?.id
          })
          .eq('id', row.productId);

        if (error) throw error;
        updated++;
      } catch (error) {
        console.error('Error updating price:', error);
        failed++;
      }

      setProgress(((i + 1) / matchedRows.length) * 100);
    }

    setResults({ updated, failed });
    setStep('complete');
    setImporting(false);
    onImportComplete();
  };

  const handleClose = () => {
    setParsedData([]);
    setStep('upload');
    setProgress(0);
    setResults({ updated: 0, failed: 0 });
    onOpenChange(false);
  };

  const matchedCount = parsedData.filter(r => r.matched).length;
  const unmatchedCount = parsedData.filter(r => !r.matched).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Prices from CSV</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">
              {isDragActive ? 'Drop the file here' : 'Drag & drop a CSV file here'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              or click to select a file
            </p>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Expected columns: Product Name, Unit Price, Cost Price (optional), Unit</p>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="default" className="bg-green-600">
                <Check className="h-3 w-3 mr-1" />
                {matchedCount} Matched
              </Badge>
              {unmatchedCount > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {unmatchedCount} Unmatched
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Product Name</th>
                    <th className="text-right p-2">Unit Price</th>
                    <th className="text-right p-2">Cost Price</th>
                    <th className="text-left p-2">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((row, idx) => (
                    <tr key={idx} className={row.matched ? '' : 'bg-yellow-50/50'}>
                      <td className="p-2">
                        {row.matched ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-yellow-600" />
                        )}
                      </td>
                      <td className="p-2">{row.productName}</td>
                      <td className="p-2 text-right">${row.unitPrice.toFixed(2)}</td>
                      <td className="p-2 text-right">
                        {row.costPrice ? `$${row.costPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-2">{row.priceUnit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            {importing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">
                  Importing... {Math.round(progress)}%
                </p>
              </div>
            )}
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center py-8">
            <Check className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h3 className="text-lg font-medium mb-2">Import Complete</h3>
            <p className="text-muted-foreground">
              Successfully updated {results.updated} product prices.
              {results.failed > 0 && ` ${results.failed} failed.`}
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => { setParsedData([]); setStep('upload'); }}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing || matchedCount === 0}>
                <Upload className="mr-2 h-4 w-4" />
                Import {matchedCount} Prices
              </Button>
            </>
          )}
          {step === 'complete' && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
