import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lock, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface EditOrderDetailsDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditOrderDetailsDialog = ({
  order,
  open,
  onOpenChange,
  onSuccess,
}: EditOrderDetailsDialogProps) => {
  const [formData, setFormData] = useState({
    total_amount: order?.total_amount || '',
    currency: order?.currency || 'USD',
    notes: order?.notes || '',
    payment_reference: order?.payment_reference || '',
  });
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const originalAmount = parseFloat(order?.total_amount || '0');
  const newAmount = parseFloat(formData.total_amount || '0');
  const percentageChange = originalAmount > 0 
    ? Math.abs((newAmount - originalAmount) / originalAmount) * 100 
    : 0;
  const significantChange = percentageChange > 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate amount
    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      toast.error('Total amount must be greater than 0');
      return;
    }

    // Show confirmation if amount changed significantly
    if (significantChange) {
      setShowConfirmDialog(true);
      return;
    }

    await performUpdate();
  };

  const performUpdate = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          total_amount: parseFloat(formData.total_amount),
          currency: formData.currency,
          notes: formData.notes || null,
          payment_reference: formData.payment_reference || null,
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Order details updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order details');
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Order Details</DialogTitle>
            <DialogDescription>
              Update order metadata. Customer and quote relationships are locked.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="pr-4">
              {order?.quote_id && (
                <Badge variant="default" className="bg-blue-500 w-fit mb-4">
                  🤖 Auto-generated from Quote
                </Badge>
              )}

              <form id="edit-order-form" onSubmit={handleSubmit} className="space-y-4">
                {/* Read-only Fields */}
                <div className="space-y-4 bg-muted/50 p-4 rounded-lg border">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground">
                      <Lock className="w-4 h-4" />
                      Order Number
                    </Label>
                    <Input value={order?.order_number} disabled className="bg-background" />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground">
                      <Lock className="w-4 h-4" />
                      Customer
                    </Label>
                    <Input 
                      value={order?.customers?.company_name || 'No customer assigned'} 
                      disabled 
                      className="bg-background" 
                    />
                    <p className="text-xs text-muted-foreground">
                      Customer cannot be changed for existing orders
                    </p>
                  </div>

                  {order?.quotes && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="w-4 h-4" />
                        Related Quote
                      </Label>
                      <Input 
                        value={order.quotes.quote_number} 
                        disabled 
                        className="bg-background" 
                      />
                      <p className="text-xs text-muted-foreground">
                        Quote relationship is locked after order creation
                      </p>
                    </div>
                  )}
                </div>

                {/* Editable Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total_amount">
                      Total Amount <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="total_amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={formData.total_amount}
                      onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                      required
                    />
                    {significantChange && (
                      <p className="text-xs text-orange-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {percentageChange.toFixed(0)}% change from original amount
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="GHS">GHS - Ghanaian Cedi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_reference">Payment Reference</Label>
                  <Input
                    id="payment_reference"
                    placeholder="e.g., Bank transfer ref, PO number..."
                    value={formData.payment_reference}
                    onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional notes about this order..."
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </form>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-order-form" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Significant Amount Change</AlertDialogTitle>
            <AlertDialogDescription>
              You're changing the order amount by {percentageChange.toFixed(1)}%.
              <br />
              <br />
              <strong>Original:</strong> {order?.currency} {originalAmount.toFixed(2)}
              <br />
              <strong>New Amount:</strong> {formData.currency} {newAmount.toFixed(2)}
              <br />
              <br />
              Are you sure you want to make this change?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performUpdate}>
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
