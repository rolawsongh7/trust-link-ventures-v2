import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { DataExporter } from '@/lib/exportHelpers';

interface BulkExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: any[];
  onComplete: () => void;
}

export const BulkExportDialog: React.FC<BulkExportDialogProps> = ({
  open,
  onOpenChange,
  selectedOrders,
  onComplete,
}) => {
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await DataExporter.exportOrders(selectedOrders, {
        format,
        filename: `orders-selection-${new Date().toISOString().split('T')[0]}`,
      });
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Selected Orders
          </DialogTitle>
          <DialogDescription>
            Export {selectedOrders.length} selected orders to a file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selection count */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <span className="text-sm">Orders to export</span>
            <Badge>{selectedOrders.length}</Badge>
          </div>

          {/* Format selection */}
          <div className="space-y-3">
            <Label>Export format</Label>
            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as 'csv' | 'excel')}
              className="grid grid-cols-2 gap-3"
            >
              <div>
                <RadioGroupItem
                  value="csv"
                  id="csv"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="csv"
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <FileText className="h-6 w-6" />
                  <span className="text-sm font-medium">CSV</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="excel"
                  id="excel"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="excel"
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <FileSpreadsheet className="h-6 w-6" />
                  <span className="text-sm font-medium">Excel</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
