import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Lock } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ManualOrderCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Customer {
  id: string;
  company_name: string;
}

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  customer_id: string;
  total_amount: number;
  currency: string;
}

export const ManualOrderCreationDialog: React.FC<ManualOrderCreationDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    quote_id: '',
    total_amount: '',
    currency: 'USD',
    status: 'order_confirmed',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchQuotes();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    // Filter quotes based on selected customer
    if (formData.customer_id) {
      const filtered = quotes.filter(q => q.customer_id === formData.customer_id);
      setFilteredQuotes(filtered);
    } else {
      setFilteredQuotes(quotes);
    }
  }, [formData.customer_id, quotes]);

  useEffect(() => {
    // Auto-populate customer and amount when quote is selected
    if (formData.quote_id) {
      const selectedQuote = quotes.find(q => q.id === formData.quote_id);
      if (selectedQuote) {
        setFormData(prev => ({
          ...prev,
          customer_id: selectedQuote.customer_id,
          total_amount: selectedQuote.total_amount.toString(),
          currency: selectedQuote.currency,
        }));
      }
    }
  }, [formData.quote_id, quotes]);

  const resetForm = () => {
    setFormData({
      customer_id: '',
      quote_id: '',
      total_amount: '',
      currency: 'USD',
      status: 'order_confirmed',
      notes: '',
    });
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name')
        .order('company_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('id, quote_number, title, customer_id, total_amount, currency')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
      setFilteredQuotes(data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    }
  };

  const handleSubmit = () => {
    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }

    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Show confirmation dialog
    setConfirmDialogOpen(true);
  };

  const handleConfirmedSubmit = async () => {
    setLoading(true);
    const submissionId = `order-${Date.now()}`;

    try {
      // Pre-validation checks
      if (!user?.id) {
        throw new Error('User not authenticated. Please log in again.');
      }

      if (!formData.customer_id) {
        throw new Error('Customer selection is required');
      }

      const amount = parseFloat(formData.total_amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Order amount must be greater than zero');
      }

      // Verify customer exists
      const { data: customerCheck, error: customerError } = await supabase
        .from('customers')
        .select('id, company_name')
        .eq('id', formData.customer_id)
        .single();

      if (customerError || !customerCheck) {
        throw new Error('Selected customer not found. Please refresh and try again.');
      }

      // If quote linked, verify it exists and matches customer
      if (formData.quote_id) {
        const { data: quoteCheck, error: quoteError } = await supabase
          .from('quotes')
          .select('id, customer_id, status')
          .eq('id', formData.quote_id)
          .single();

        if (quoteError || !quoteCheck) {
          throw new Error('Selected quote not found. Please refresh and try again.');
        }

        if (quoteCheck.customer_id !== formData.customer_id) {
          throw new Error('Quote does not belong to selected customer');
        }

        if (quoteCheck.status === 'accepted') {
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('order_number')
            .eq('quote_id', formData.quote_id)
            .maybeSingle();

          if (existingOrder) {
            throw new Error(`An order (${existingOrder.order_number}) already exists for this quote`);
          }
        }
      }

      // Insert order with comprehensive error handling
      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          customer_id: formData.customer_id,
          quote_id: formData.quote_id || null,
          total_amount: amount,
          currency: formData.currency,
          status: formData.status as any,
          notes: formData.notes || null,
          created_by: user.id,
        } as any)
        .select('id, order_number')
        .single();

      if (insertError) {
        if (insertError.code === '23503') {
          throw new Error('Invalid customer or quote reference. Please refresh and try again.');
        } else if (insertError.code === '23505') {
          throw new Error('An order with this information already exists');
        } else {
          throw new Error(`Database error: ${insertError.message}`);
        }
      }

      if (!newOrder) {
        throw new Error('Order created but no data returned. Please check orders list.');
      }

      console.log(`✅ Order ${newOrder.order_number} created successfully (ID: ${newOrder.id})`);

      // Log to audit
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        event_type: 'manual_order_created',
        action: 'create',
        resource_type: 'order',
        resource_id: newOrder.id,
        event_data: {
          order_number: newOrder.order_number,
          customer_id: formData.customer_id,
          quote_id: formData.quote_id,
          amount: amount,
          is_manual: !formData.quote_id,
        },
        severity: 'low',
      });

      toast.success(
        `Order ${newOrder.order_number} created successfully`,
        { description: `Total: ${amount.toLocaleString()} ${formData.currency}` }
      );

      onSuccess();
      onOpenChange(false);
      resetForm();

    } catch (error: any) {
      console.error('❌ Order creation failed:', error);

      const errorMessage = error.message || 'An unexpected error occurred';
      
      toast.error('Failed to Create Order', {
        description: errorMessage,
        duration: 5000,
      });

      supabase.from('audit_logs').insert({
        user_id: user?.id,
        event_type: 'manual_order_creation_failed',
        action: 'create_failed',
        resource_type: 'order',
        event_data: {
          error: error.message,
          form_data: formData,
          submission_id: submissionId,
        },
        severity: 'medium',
      }).then(({ error: logError }) => {
        if (logError) console.error('Failed to log error:', logError);
      });

    } finally {
      setLoading(false);
      setConfirmDialogOpen(false);
    }
  };

  const isQuoteLinked = !!formData.quote_id;
  const isManualOrder = !formData.quote_id;
  const selectedCustomer = customers.find(c => c.id === formData.customer_id);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Manual Order</DialogTitle>
            <DialogDescription>
              Create a new order manually. You can optionally link it to an existing quote.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Warning Badge */}
            {isManualOrder && formData.customer_id && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      ✍️ Manual Order - No Quote Linkage
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      This order will not be linked to any quote. Make sure all details are correct before proceeding.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quote Selection (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="quote_id">
                Link to Quote (Optional)
                {isQuoteLinked && <Badge className="ml-2 bg-blue-500">Auto-populating fields</Badge>}
              </Label>
              <Select
                value={formData.quote_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, quote_id: value }))}
              >
                <SelectTrigger id="quote_id">
                  <SelectValue placeholder="Select a quote (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Quote (Manual Order)</SelectItem>
                  {filteredQuotes.map((quote) => (
                    <SelectItem key={quote.id} value={quote.id}>
                      {quote.quote_number} - {quote.title} ({quote.total_amount} {quote.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                If you select a quote, customer and amount will be auto-populated and locked.
              </p>
            </div>

            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer_id">
                Customer <span className="text-red-500">*</span>
                {isQuoteLinked && <Lock className="inline-block w-3 h-3 ml-1 text-gray-500" />}
              </Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, customer_id: value }))}
                disabled={isQuoteLinked}
              >
                <SelectTrigger id="customer_id" disabled={isQuoteLinked}>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isQuoteLinked && (
                <p className="text-xs text-muted-foreground">
                  🔒 Locked - Customer is automatically set from the selected quote
                </p>
              )}
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_amount">
                  Total Amount <span className="text-red-500">*</span>
                  {isQuoteLinked && <Lock className="inline-block w-3 h-3 ml-1 text-gray-500" />}
                </Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.total_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                  disabled={isQuoteLinked}
                />
                {isQuoteLinked && (
                  <p className="text-xs text-muted-foreground">
                    🔒 Locked - Amount from quote
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                  disabled={isQuoteLinked}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Initial Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order_confirmed">Order Confirmed</SelectItem>
                  <SelectItem value="pending_payment">Pending Payment</SelectItem>
                  <SelectItem value="payment_received">Payment Received</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this order..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !formData.customer_id || !formData.total_amount}
            >
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Order Creation</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Please review the order details before creating:</p>
                <div className="bg-gray-50 rounded-md p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Type:</span>
                    <Badge className={isQuoteLinked ? "bg-blue-500" : "bg-amber-500"}>
                      {isQuoteLinked ? "🤖 Auto-generated" : "✍️ Manual"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Customer:</span>
                    <span>{selectedCustomer?.company_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Amount:</span>
                    <span className="font-semibold">{formData.total_amount} {formData.currency}</span>
                  </div>
                  {formData.quote_id && (
                    <div className="flex justify-between">
                      <span className="font-medium">Linked Quote:</span>
                      <span>{quotes.find(q => q.id === formData.quote_id)?.quote_number}</span>
                    </div>
                  )}
                </div>
                {isManualOrder && (
                  <p className="text-sm text-amber-600 font-medium">
                    ⚠️ This is a manual order. Customer and quote relationships cannot be changed after creation.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Review</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Confirm & Create'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
