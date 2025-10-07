import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Package, Truck, AlertTriangle } from 'lucide-react';

interface DeliveryManagementDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const DeliveryManagementDialog = ({
  order,
  open,
  onOpenChange,
  onSuccess,
}: DeliveryManagementDialogProps) => {
  const [formData, setFormData] = useState({
    tracking_number: order?.tracking_number || '',
    carrier: order?.carrier || '',
    estimated_delivery_date: order?.estimated_delivery_date || '',
    delivery_notes: order?.delivery_notes || '',
    status: order?.status || '',
  });
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // Get valid next statuses
  const getValidNextStatuses = (currentStatus: string): string[] => {
    const validTransitions: Record<string, string[]> = {
      'order_confirmed': ['pending_payment', 'cancelled'],
      'pending_payment': ['payment_received', 'cancelled'],
      'payment_received': ['processing', 'cancelled'],
      'processing': ['ready_to_ship', 'cancelled'],
      'ready_to_ship': ['shipped', 'cancelled'],
      'shipped': ['delivered', 'delivery_failed'],
      'delivered': [],
      'cancelled': [],
      'delivery_failed': ['shipped'],
    };
    return validTransitions[currentStatus] || [];
  };

  const validNextStatuses = getValidNextStatuses(order?.status || '');

  const getStatusWarning = (status: string): string | null => {
    if (status === 'ready_to_ship') {
      return '⚠️ This will:\n• Generate a Packing List\n• Validate delivery address\n• Mark order as ready for shipping';
    }
    if (status === 'shipped') {
      return '⚠️ This will:\n• Generate a Commercial Invoice\n• Send tracking email to customer\n• Create delivery tracking link';
    }
    return null;
  };

  const handleStatusChange = (newStatus: string) => {
    const warning = getStatusWarning(newStatus);
    if (warning) {
      setPendingStatus(newStatus);
      setShowConfirmDialog(true);
    } else {
      setFormData({ ...formData, status: newStatus });
    }
  };

  const confirmStatusChange = () => {
    if (pendingStatus) {
      setFormData({ ...formData, status: pendingStatus });
      setPendingStatus(null);
    }
    setShowConfirmDialog(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate delivery address for critical statuses
      if (['ready_to_ship', 'shipped'].includes(formData.status) && !order.delivery_address_id) {
        toast.error('Cannot mark as ready to ship without a delivery address. Please request delivery address from customer first.');
        setLoading(false);
        return;
      }

      const updateData: any = {
        tracking_number: formData.tracking_number || null,
        carrier: formData.carrier || null,
        estimated_delivery_date: formData.estimated_delivery_date || null,
        delivery_notes: formData.delivery_notes || null,
        status: formData.status,
      };

      // Update order
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id);

      if (error) {
        if (error.message.includes('Invalid order status transition')) {
          toast.error('Invalid status transition. Please select a valid next status.');
        } else if (error.message.includes('delivery address')) {
          toast.error('Delivery address required before shipping.');
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      // Add to delivery history
      await supabase.from('delivery_history').insert({
        order_id: order.id,
        status: formData.status,
        notes: formData.delivery_notes,
      });

      toast.success('Delivery information updated');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating delivery:', error);
      toast.error('Failed to update delivery information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Manage Delivery & Tracking
            </DialogTitle>
            <DialogDescription>
              Update shipping and delivery information for order {order?.order_number}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Order Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {validNextStatuses.length === 0 ? (
                      <SelectItem value={order?.status} disabled>
                        {order?.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (Final status)
                      </SelectItem>
                    ) : (
                      validNextStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {validNextStatuses.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    This order has reached a final status
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="carrier">Carrier</Label>
                <Input
                  id="carrier"
                  placeholder="e.g., DHL, FedEx, UPS"
                  value={formData.carrier}
                  onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tracking_number">Tracking Number</Label>
                <Input
                  id="tracking_number"
                  placeholder="Enter tracking number"
                  value={formData.tracking_number}
                  onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_delivery_date">Estimated Delivery Date</Label>
                <Input
                  id="estimated_delivery_date"
                  type="date"
                  value={formData.estimated_delivery_date}
                  onChange={(e) => setFormData({ ...formData, estimated_delivery_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_notes">Delivery Notes</Label>
              <Textarea
                id="delivery_notes"
                placeholder="Add any delivery instructions or notes..."
                rows={3}
                value={formData.delivery_notes}
                onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || validNextStatuses.length === 0}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Confirm Status Change
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {pendingStatus && getStatusWarning(pendingStatus)}
              <br />
              <br />
              Do you want to proceed with this status change?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStatus(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
