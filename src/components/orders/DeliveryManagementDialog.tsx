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
import { ProofOfDeliveryUpload } from './ProofOfDeliveryUpload';

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
    delivery_window: order?.delivery_window || '',
    delivery_notes: order?.delivery_notes || '',
    status: order?.status || '',
    proof_of_delivery_url: order?.proof_of_delivery_url || '',
    delivered_by: order?.delivered_by || '',
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
      'delivery_confirmation_pending': ['delivered'],
      'delivered': [],
      'cancelled': [],
      'delivery_failed': ['shipped'],
    };
    return validTransitions[currentStatus] || [];
  };

  const validNextStatuses = getValidNextStatuses(order?.status || '');

  const getStatusWarning = (status: string): string | null => {
    if (status === 'ready_to_ship') {
      return '✅ This will:\n• Auto-generate Packing List\n• Validate delivery address\n• Mark order as ready for shipping';
    }
    if (status === 'shipped') {
      return '✅ This will:\n• Auto-generate Commercial Invoice\n• Send tracking email to customer\n• Create delivery tracking link\n\n⚠️ Required fields:\n• Carrier\n• Tracking Number\n• Estimated Delivery Date';
    }
    if (status === 'delivered') {
      return '✅ This will mark the order as complete and delivered to the customer.';
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

      // Validate required fields for 'shipped' status
      if (formData.status === 'shipped') {
        if (!formData.carrier || formData.carrier.trim() === '') {
          toast.error('Carrier is required to mark order as shipped');
          setLoading(false);
          return;
        }
        if (!formData.tracking_number || formData.tracking_number.trim() === '') {
          toast.error('Tracking number is required to mark order as shipped');
          setLoading(false);
          return;
        }
        if (!formData.estimated_delivery_date) {
          toast.error('Estimated delivery date is required to mark order as shipped');
          setLoading(false);
          return;
        }
      }

      // Require proof of delivery when marking as delivered
      if (formData.status === 'delivered' && !formData.proof_of_delivery_url) {
        toast.error('Proof of delivery is required to mark order as delivered');
        setLoading(false);
        return;
      }

      const updateData: any = {
        tracking_number: formData.tracking_number || null,
        carrier: formData.carrier || null,
        estimated_delivery_date: formData.estimated_delivery_date || null,
        delivery_window: formData.delivery_window || null,
        delivery_notes: formData.delivery_notes || null,
        status: formData.status,
        proof_of_delivery_url: formData.proof_of_delivery_url || null,
        delivered_by: formData.delivered_by || null,
        ...(formData.status === 'delivered' && { delivered_at: new Date().toISOString() }),
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
        } else if (error.message.includes('carrier')) {
          toast.error('Carrier information is required to mark as shipped.');
        } else if (error.message.includes('tracking number')) {
          toast.error('Tracking number is required to mark as shipped.');
        } else if (error.message.includes('estimated delivery date')) {
          toast.error('Estimated delivery date is required to mark as shipped.');
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

      // Send notifications if status changed
      if (formData.status !== order.status) {
        try {
          const { data: orderData } = await supabase
            .from('orders')
            .select('customer_id, order_number, tracking_number, customers(email, company_name, contact_name)')
            .eq('id', order.id)
            .single();

          if (orderData?.customer_id && orderData?.customers?.email) {
            const { NotificationService } = await import('@/services/notificationService');
            
            switch (formData.status) {
              case 'ready_to_ship':
                await NotificationService.sendOrderReadyToShipNotification(
                  orderData.customer_id,
                  orderData.order_number,
                  order.id,
                  orderData.customers.email
                );
                break;
              case 'shipped':
                await NotificationService.sendOrderShippedNotification(
                  orderData.customer_id,
                  orderData.order_number,
                  order.id,
                  orderData.customers.email,
                  formData.tracking_number || undefined
                );
                
                // Send shipped email notification
                try {
                  await supabase.functions.invoke('send-email', {
                    body: {
                      to: orderData.customers.email,
                      subject: `Your Order #${orderData.order_number} Has Been Shipped`,
                      type: 'order_shipped',
                      data: {
                        orderNumber: orderData.order_number,
                        customerName: orderData.customers.contact_name || orderData.customers.company_name || 'Valued Customer',
                        orderId: order.id,
                        trackingNumber: formData.tracking_number || null,
                        trackingLink: `https://trustlinkcompany.com/portal/orders/${order.id}`
                      }
                    }
                  });
                  console.log('[DeliveryManagement] Shipped email sent successfully');
                } catch (emailError) {
                  console.error('Failed to send shipped email:', emailError);
                }
                break;
              case 'delivered':
                await NotificationService.sendOrderDeliveredNotification(
                  orderData.customer_id,
                  orderData.order_number,
                  order.id,
                  orderData.customers.email,
                  !!formData.proof_of_delivery_url // hasPOD
                );
                break;
            }
          }
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
          // Don't block the success flow for notification errors
        }
      }

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
              Manage Shipping & Order Status
            </DialogTitle>
            <DialogDescription>
              Update order status, shipping details, and tracking information for {order?.order_number}
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
                    {/* Current status */}
                    <SelectItem value={order?.status}>
                      {order?.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (Current)
                    </SelectItem>
                    
                    {/* Valid next statuses */}
                    {validNextStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validNextStatuses.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    This order has reached a final status
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="carrier">
                  Carrier {formData.status === 'shipped' && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={formData.carrier}
                  onValueChange={(value) => setFormData({ ...formData, carrier: value })}
                >
                  <SelectTrigger id="carrier">
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DHL">DHL</SelectItem>
                    <SelectItem value="FedEx">FedEx</SelectItem>
                    <SelectItem value="UPS">UPS</SelectItem>
                    <SelectItem value="Ghana Post">Ghana Post</SelectItem>
                    <SelectItem value="Skynet">Skynet</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tracking_number">
                  Tracking Number {formData.status === 'shipped' && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="tracking_number"
                  placeholder="Enter tracking number"
                  value={formData.tracking_number}
                  onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_delivery_date">
                  Estimated Delivery Date {formData.status === 'shipped' && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="estimated_delivery_date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.estimated_delivery_date}
                  onChange={(e) => setFormData({ ...formData, estimated_delivery_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_window">Delivery Window</Label>
              <Select
                value={formData.delivery_window}
                onValueChange={(value) => setFormData({ ...formData, delivery_window: value })}
              >
                <SelectTrigger id="delivery_window">
                  <SelectValue placeholder="Select delivery window" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (9 AM - 12 PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12 PM - 5 PM)</SelectItem>
                  <SelectItem value="evening">Evening (5 PM - 8 PM)</SelectItem>
                  <SelectItem value="all_day">All Day (9 AM - 8 PM)</SelectItem>
                </SelectContent>
              </Select>
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

            {/* Delivered By field - shown when status is delivered */}
            {formData.status === 'delivered' && (
              <div className="space-y-2">
                <Label htmlFor="delivered_by">
                  Delivered By
                </Label>
                <Input
                  id="delivered_by"
                  placeholder="Enter driver or delivery person name"
                  value={formData.delivered_by}
                  onChange={(e) => setFormData({ ...formData, delivered_by: e.target.value })}
                />
              </div>
            )}

            {/* Proof of Delivery Upload - shown when status is delivered */}
            {formData.status === 'delivered' && (
              <ProofOfDeliveryUpload
                orderId={order?.id}
                orderNumber={order?.order_number}
                onUploadComplete={(url) => setFormData({ ...formData, proof_of_delivery_url: url })}
                existingUrl={formData.proof_of_delivery_url}
                required={true}
              />
            )}

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