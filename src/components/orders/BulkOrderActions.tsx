import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { logError } from '@/lib/errorMonitoring';

interface BulkOrderActionsProps {
  selectedOrderIds: string[];
  onComplete: () => void;
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  order_confirmed: ['pending_payment', 'cancelled'],
  pending_payment: ['payment_received', 'cancelled'],
  payment_received: ['processing', 'cancelled'],
  processing: ['ready_to_ship', 'cancelled'],
  ready_to_ship: ['shipped', 'cancelled'],
  shipped: ['delivered', 'delivery_failed'],
  delivery_failed: ['shipped'],
};

export const BulkOrderActions: React.FC<BulkOrderActionsProps> = ({ selectedOrderIds, onComplete }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [results, setResults] = useState<{ success: string[]; failed: Array<{ id: string; error: string }> } | null>(null);

  const handleBulkUpdate = async () => {
    if (!newStatus) {
      toast.error('Please select a status');
      return;
    }

    setLoading(true);
    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    try {
      // Fetch current order statuses
      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('id, order_number, status, delivery_address_id, notes')
        .in('id', selectedOrderIds);

      if (fetchError) throw fetchError;

      // Validate and update each order
      for (const order of orders || []) {
        try {
          // Check if transition is valid
          const allowedStatuses = VALID_STATUS_TRANSITIONS[order.status];
          if (!allowedStatuses?.includes(newStatus)) {
            failed.push({
              id: order.order_number,
              error: `Invalid transition: ${order.status} → ${newStatus}. Allowed: ${allowedStatuses?.join(', ') || 'none'}`,
            });
            continue;
          }

          // Check delivery address requirement
          if (['ready_to_ship', 'shipped'].includes(newStatus) && !order.delivery_address_id) {
            failed.push({
              id: order.order_number,
              error: 'Missing delivery address',
            });
            continue;
          }

          // Update order
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: newStatus as any,
              notes: notes ? `${order.notes || ''}\n\n[BULK UPDATE]: ${notes}` : order.notes,
            })
            .eq('id', order.id);

          if (updateError) {
            failed.push({
              id: order.order_number,
              error: updateError.message,
            });
          } else {
            success.push(order.order_number);
          }
        } catch (error: any) {
          failed.push({
            id: order.order_number,
            error: error.message || 'Unknown error',
          });
          logError({ component: 'BulkOrderActions', action: 'UPDATE_ITEM', error, context: { orderId: order.id } });
        }
      }

      // Log bulk action to audit
      await supabase.from('audit_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        event_type: 'bulk_order_update',
        action: 'UPDATE',
        resource_type: 'orders',
        event_data: {
          total_orders: selectedOrderIds.length,
          new_status: newStatus,
          success_count: success.length,
          failed_count: failed.length,
          notes,
        },
        severity: failed.length > 0 ? 'medium' : 'low',
      });

      setResults({ success, failed });
      
      if (failed.length === 0) {
        toast.success(`Successfully updated ${success.length} orders`);
        setTimeout(() => {
          setOpen(false);
          onComplete();
        }, 2000);
      } else {
        toast.warning(`Updated ${success.length} orders, ${failed.length} failed`);
      }
    } catch (error: any) {
      logError({ component: 'BulkOrderActions', action: 'BULK_UPDATE', error, context: { selectedOrderIds, newStatus } });
      toast.error('Bulk update failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setNewStatus('');
    setNotes('');
    setResults(null);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={selectedOrderIds.length === 0}>
        Bulk Update ({selectedOrderIds.length})
      </Button>

      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetDialog();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Update Orders</DialogTitle>
            <DialogDescription>
              Update status for {selectedOrderIds.length} selected order(s)
            </DialogDescription>
          </DialogHeader>

          {!results ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_payment">Pending Payment</SelectItem>
                    <SelectItem value="payment_received">Payment Received</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this bulk update..."
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Success: {results.success.length} orders</span>
                </div>
                {results.success.length > 0 && (
                  <div className="text-sm text-muted-foreground pl-7">
                    {results.success.join(', ')}
                  </div>
                )}
              </div>

              {results.failed.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">Failed: {results.failed.length} orders</span>
                  </div>
                  <div className="space-y-1 pl-7">
                    {results.failed.map((item, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{item.id}:</span>{' '}
                        <span className="text-muted-foreground">{item.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {!results ? (
              <>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleBulkUpdate} disabled={loading || !newStatus}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Orders
                </Button>
              </>
            ) : (
              <Button onClick={() => {
                setOpen(false);
                onComplete();
              }}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
