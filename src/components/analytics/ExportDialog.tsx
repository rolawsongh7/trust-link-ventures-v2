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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Users, 
  ShoppingCart,
  Sparkles,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ExportOption = 
  | 'executive_summary' 
  | 'customer_health' 
  | 'at_risk_orders' 
  | 'ai_insights'
  | 'operations_report';

interface ExportOptionConfig {
  id: ExportOption;
  label: string;
  description: string;
  format: 'PDF' | 'CSV';
  icon: React.ReactNode;
}

const EXPORT_OPTIONS: ExportOptionConfig[] = [
  {
    id: 'executive_summary',
    label: 'Executive Summary',
    description: 'Key metrics, top insights, and recommended actions',
    format: 'PDF',
    icon: <FileText className="h-4 w-4" />
  },
  {
    id: 'customer_health',
    label: 'Customer Health Scores',
    description: 'All customers with health scores and trends',
    format: 'CSV',
    icon: <Users className="h-4 w-4" />
  },
  {
    id: 'at_risk_orders',
    label: 'At-Risk Orders',
    description: 'Orders pending payment or likely to miss SLA',
    format: 'CSV',
    icon: <ShoppingCart className="h-4 w-4" />
  },
  {
    id: 'ai_insights',
    label: 'AI Insights Report',
    description: 'All AI-generated insights with recommendations',
    format: 'PDF',
    icon: <Sparkles className="h-4 w-4" />
  },
  {
    id: 'operations_report',
    label: 'Operations Report',
    description: 'Order cycle times, bottlenecks, and issue patterns',
    format: 'CSV',
    icon: <FileSpreadsheet className="h-4 w-4" />
  }
];

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOption[]) => Promise<void>;
  availableOptions?: ExportOption[];
  title?: string;
  description?: string;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onOpenChange,
  onExport,
  availableOptions = ['executive_summary', 'customer_health', 'at_risk_orders', 'ai_insights', 'operations_report'],
  title = 'Export Analytics Data',
  description = 'Select the data you want to export. CSV files contain raw data, PDF files contain formatted reports.'
}) => {
  const [selectedOptions, setSelectedOptions] = useState<ExportOption[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const toggleOption = (option: ExportOption) => {
    setSelectedOptions(prev => 
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    );
  };

  const selectAll = () => {
    setSelectedOptions(availableOptions);
  };

  const deselectAll = () => {
    setSelectedOptions([]);
  };

  const handleExport = async () => {
    if (selectedOptions.length === 0) return;
    
    setIsExporting(true);
    try {
      await onExport(selectedOptions);
      onOpenChange(false);
      setSelectedOptions([]);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredOptions = EXPORT_OPTIONS.filter(opt => availableOptions.includes(opt.id));
  const csvOptions = filteredOptions.filter(opt => opt.format === 'CSV');
  const pdfOptions = filteredOptions.filter(opt => opt.format === 'PDF');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedOptions.length} selected
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Clear
              </Button>
            </div>
          </div>

          {/* PDF Reports */}
          {pdfOptions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Reports (PDF)
              </div>
              <div className="space-y-2">
                {pdfOptions.map(option => (
                  <ExportOptionItem
                    key={option.id}
                    option={option}
                    selected={selectedOptions.includes(option.id)}
                    onToggle={() => toggleOption(option.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {pdfOptions.length > 0 && csvOptions.length > 0 && (
            <Separator />
          )}

          {/* CSV Data */}
          {csvOptions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Data Exports (CSV)
              </div>
              <div className="space-y-2">
                {csvOptions.map(option => (
                  <ExportOptionItem
                    key={option.id}
                    option={option}
                    selected={selectedOptions.includes(option.id)}
                    onToggle={() => toggleOption(option.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={selectedOptions.length === 0 || isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {selectedOptions.length > 0 && `(${selectedOptions.length})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ExportOptionItemProps {
  option: ExportOptionConfig;
  selected: boolean;
  onToggle: () => void;
}

const ExportOptionItem: React.FC<ExportOptionItemProps> = ({
  option,
  selected,
  onToggle
}) => {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
        selected 
          ? 'bg-primary/5 border-primary/30' 
          : 'hover:bg-muted/50 border-border'
      )}
      onClick={onToggle}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {option.icon}
          <Label className="font-medium cursor-pointer">{option.label}</Label>
          <Badge variant="outline" className="text-xs">
            {option.format}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {option.description}
        </p>
      </div>
    </div>
  );
};
