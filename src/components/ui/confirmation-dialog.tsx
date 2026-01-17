import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string | React.ReactNode;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
  affectedRecords?: {
    label: string;
    count: number;
  }[];
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
  affectedRecords,
}) => {
  const Icon = variant === 'destructive' ? Trash2 : AlertTriangle;
  const hasAffectedRecords = affectedRecords && affectedRecords.some(r => r.count > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', variant === 'destructive' ? 'text-destructive' : 'text-amber-500')} />
            {title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <div>{description}</div>
              
              {hasAffectedRecords && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-3">
                  <p className="text-sm font-medium text-destructive mb-2">
                    ⚠️ Warning: This will also affect:
                  </p>
                  <ul className="text-sm space-y-1">
                    {affectedRecords.filter(r => r.count > 0).map((record, idx) => (
                      <li key={idx} className="text-muted-foreground">
                        • {record.count} {record.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};