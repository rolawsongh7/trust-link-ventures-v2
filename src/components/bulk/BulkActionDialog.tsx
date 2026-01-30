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
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface BulkActionResult {
  success: string[];
  failed: { id: string; identifier: string; error: string }[];
}

interface BulkActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  selectedItems: Array<{ id: string; identifier: string }>;
  onExecute: () => Promise<BulkActionResult>;
  onComplete: () => void;
  children?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  auditEventType?: string;
  resourceType?: string;
}

type ExecutionState = 'idle' | 'executing' | 'completed';

export const BulkActionDialog: React.FC<BulkActionDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  selectedItems,
  onExecute,
  onComplete,
  children,
  confirmLabel = 'Confirm',
  destructive = false,
  auditEventType,
  resourceType,
}) => {
  const [state, setState] = useState<ExecutionState>('idle');
  const [result, setResult] = useState<BulkActionResult | null>(null);

  const handleExecute = async () => {
    setState('executing');
    try {
      const actionResult = await onExecute();
      setResult(actionResult);

      // Log batch audit event if specified
      if (auditEventType && resourceType) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('audit_logs').insert({
          user_id: user?.id,
          event_type: auditEventType,
          action: 'BATCH_UPDATE',
          resource_type: resourceType,
          event_data: {
            total_items: selectedItems.length,
            success_count: actionResult.success.length,
            failed_count: actionResult.failed.length,
            identifiers: selectedItems.map(i => i.identifier),
          },
          severity: 'info',
        });
      }

      setState('completed');
    } catch (error) {
      console.error('Bulk action error:', error);
      setResult({
        success: [],
        failed: selectedItems.map(item => ({
          id: item.id,
          identifier: item.identifier,
          error: error instanceof Error ? error.message : 'Unknown error',
        })),
      });
      setState('completed');
    }
  };

  const handleClose = () => {
    if (state === 'completed') {
      onComplete();
    }
    setState('idle');
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {destructive && <AlertTriangle className="h-5 w-5 text-destructive" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4">
          {state === 'idle' && (
            <>
              {/* Selected items preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Selected items</span>
                  <Badge variant="secondary">{selectedItems.length}</Badge>
                </div>
                <ScrollArea className="h-32 rounded-md border p-2">
                  <div className="space-y-1">
                    {selectedItems.map((item) => (
                      <div
                        key={item.id}
                        className="text-sm text-muted-foreground font-mono"
                      >
                        {item.identifier}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Configuration form slot */}
              {children}
            </>
          )}

          {state === 'executing' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Processing {selectedItems.length} items...
              </p>
            </div>
          )}

          {state === 'completed' && result && (
            <div className="space-y-4">
              {/* Success summary */}
              {result.success.length > 0 && (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-700 dark:text-green-300">
                      {result.success.length} succeeded
                    </span>
                  </div>
                </div>
              )}

              {/* Failure summary */}
              {result.failed.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="font-medium text-red-700 dark:text-red-300">
                      {result.failed.length} failed
                    </span>
                  </div>
                  <ScrollArea className="h-24">
                    <div className="space-y-1 text-sm">
                      {result.failed.map((item) => (
                        <div key={item.id} className="text-red-600 dark:text-red-400">
                          <span className="font-mono">{item.identifier}</span>:{' '}
                          <span className="text-muted-foreground">{item.error}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          {state === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant={destructive ? 'destructive' : 'default'}
                onClick={handleExecute}
                disabled={selectedItems.length === 0}
              >
                {confirmLabel}
              </Button>
            </>
          )}

          {state === 'completed' && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
