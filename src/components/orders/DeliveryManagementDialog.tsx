import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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

      if (error) throw error;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Delivery Management</DialogTitle>
          <DialogDescription>
            Update delivery information for order {order?.order_number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Order Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quote_pending">Quote Pending</SelectItem>
                  <SelectItem value="quote_sent">Quote Sent</SelectItem>
                  <SelectItem value="order_confirmed">Order Confirmed</SelectItem>
                  <SelectItem value="payment_received">Payment Received</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="delivery_failed">Delivery Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
