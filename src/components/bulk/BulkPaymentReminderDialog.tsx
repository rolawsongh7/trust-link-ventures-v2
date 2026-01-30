import React, { useMemo } from 'react';
import { BulkActionDialog, BulkActionResult } from './BulkActionDialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Mail, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BulkPaymentReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: Array<{
    id: string;
    order_number: string;
    payment_status?: string;
    balance_remaining?: number;
    total_amount: number;
    currency: string;
    customers?: {
      email?: string;
      company_name?: string;
    } | null;
  }>;
  onComplete: () => void;
}

type OrderItem = BulkPaymentReminderDialogProps['selectedOrders'][0];

interface ValidationResult {
  eligible: OrderItem[];
  ineligible: Array<{ order: OrderItem; reason: string }>;
}

export const BulkPaymentReminderDialog: React.FC<BulkPaymentReminderDialogProps> = ({
  open,
  onOpenChange,
  selectedOrders,
  onComplete,
}) => {
  // Validate which orders are eligible for reminders
  const validation = useMemo((): ValidationResult => {
    const eligible: typeof selectedOrders = [];
    const ineligible: Array<{ order: typeof selectedOrders[0]; reason: string }> = [];

    for (const order of selectedOrders) {
      // Check if fully paid
      if (order.payment_status === 'fully_paid' || order.payment_status === 'overpaid') {
        ineligible.push({ order, reason: 'Already fully paid' });
        continue;
      }

      // Check if has customer email
      if (!order.customers?.email) {
        ineligible.push({ order, reason: 'No customer email' });
        continue;
      }

      // Check if has balance
      const balance = order.balance_remaining ?? order.total_amount;
      if (balance <= 0) {
        ineligible.push({ order, reason: 'No balance due' });
        continue;
      }

      eligible.push(order);
    }

    return { eligible, ineligible };
  }, [selectedOrders]);

  const selectedItems = validation.eligible.map((order) => ({
    id: order.id,
    identifier: order.order_number,
  }));

  const handleExecute = async (): Promise<BulkActionResult> => {
    const success: string[] = [];
    const failed: { id: string; identifier: string; error: string }[] = [];

    for (const order of validation.eligible) {
      try {
        const { error } = await supabase.functions.invoke('send-balance-payment-request', {
          body: { orderId: order.id },
        });

        if (error) throw error;
        success.push(order.id);
      } catch (error) {
        failed.push({
          id: order.id,
          identifier: order.order_number,
          error: error instanceof Error ? error.message : 'Failed to send reminder',
        });
      }
    }

    if (success.length > 0) {
      toast({
        title: 'Payment reminders sent',
        description: `Successfully sent ${success.length} reminder emails`,
      });
    }

    return { success, failed };
  };

  return (
    <BulkActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Send Payment Reminders"
      description="Send balance payment request emails to customers with outstanding payments."
      selectedItems={selectedItems}
      onExecute={handleExecute}
      onComplete={onComplete}
      confirmLabel={`Send ${validation.eligible.length} Reminders`}
      auditEventType="bulk_payment_reminder"
      resourceType="orders"
    >
      <div className="space-y-4">
        {/* Eligibility summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <div>
              <div className="font-medium text-green-700 dark:text-green-300">
                {validation.eligible.length} eligible
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                Ready to send
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <div>
              <div className="font-medium text-amber-700 dark:text-amber-300">
                {validation.ineligible.length} ineligible
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400">
                Will be skipped
              </div>
            </div>
          </div>
        </div>

        {/* Ineligible details */}
        {validation.ineligible.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Skipped orders:
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1 text-sm">
              {validation.ineligible.map(({ order, reason }) => (
                <div key={order.id} className="flex items-center justify-between">
                  <span className="font-mono text-muted-foreground">
                    {order.order_number}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {reason}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Email preview indicator */}
        {validation.eligible.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Emails will be sent to customer addresses on file
            </span>
          </div>
        )}
      </div>
    </BulkActionDialog>
  );
};
