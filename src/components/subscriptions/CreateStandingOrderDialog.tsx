// Create Standing Order Dialog
// Phase 5.3: Form for creating new recurring orders

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';
import { 
  useStandingOrderMutations,
  type StandingOrderFrequency,
  type CreateStandingOrderInput,
  getDayOfWeekLabel,
} from '@/hooks/useStandingOrders';

interface CreateStandingOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName?: string;
}

interface ItemInput {
  product_name: string;
  product_description: string;
  quantity: number;
  unit: string;
  unit_price: number | null;
  grade: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => i + 1);

export function CreateStandingOrderDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
}: CreateStandingOrderDialogProps) {
  const { createStandingOrder } = useStandingOrderMutations();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<StandingOrderFrequency>('monthly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [autoUseCredit, setAutoUseCredit] = useState(false);
  const [items, setItems] = useState<ItemInput[]>([
    { product_name: '', product_description: '', quantity: 1, unit: 'MT', unit_price: null, grade: '' },
  ]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setFrequency('monthly');
    setDayOfWeek(1);
    setDayOfMonth(1);
    setRequiresApproval(true);
    setAutoUseCredit(false);
    setItems([{ product_name: '', product_description: '', quantity: 1, unit: 'MT', unit_price: null, grade: '' }]);
  };

  const handleSubmit = async () => {
    const input: CreateStandingOrderInput = {
      customer_id: customerId,
      name,
      description: description || undefined,
      frequency,
      day_of_week: frequency === 'weekly' || frequency === 'biweekly' ? dayOfWeek : undefined,
      day_of_month: frequency === 'monthly' || frequency === 'quarterly' ? dayOfMonth : undefined,
      requires_approval: requiresApproval,
      auto_use_credit: autoUseCredit,
      items: items
        .filter(item => item.product_name.trim())
        .map(item => ({
          product_id: null,
          product_name: item.product_name,
          product_description: item.product_description || null,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          grade: item.grade || null,
          specifications: null,
          notes: null,
        })),
    };

    await createStandingOrder.mutateAsync(input);
    resetForm();
    onOpenChange(false);
  };

  const addItem = () => {
    setItems([...items, { product_name: '', product_description: '', quantity: 1, unit: 'MT', unit_price: null, grade: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ItemInput, value: string | number | null) => {
    setItems(items.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const isValid = name.trim() && items.some(item => item.product_name.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Standing Order</DialogTitle>
          <DialogDescription>
            Set up a recurring order schedule for {customerName || 'this customer'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Order Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Monthly Rice Supply"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency *</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as StandingOrderFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Schedule Day */}
          <div className="space-y-2">
            <Label>
              {frequency === 'weekly' || frequency === 'biweekly' ? 'Day of Week' : 'Day of Month'}
            </Label>
            {frequency === 'weekly' || frequency === 'biweekly' ? (
              <Select value={dayOfWeek.toString()} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(day => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={dayOfMonth.toString()} onValueChange={(v) => setDayOfMonth(parseInt(v))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_MONTH.map(day => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this standing order"
              rows={2}
            />
          </div>

          {/* Options */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Requires Approval</Label>
                <p className="text-xs text-muted-foreground">
                  Generated quotes need admin approval before becoming orders
                </p>
              </div>
              <Switch
                checked={requiresApproval}
                onCheckedChange={setRequiresApproval}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Use Credit</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically apply credit terms when converting to order
                </p>
              </div>
              <Switch
                checked={autoUseCredit}
                onCheckedChange={setAutoUseCredit}
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Order Items</Label>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Product Name *</Label>
                      <Input
                        value={item.product_name}
                        onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                        placeholder="e.g., Thai Rice 5% Broken"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Grade</Label>
                      <Input
                        value={item.grade}
                        onChange={(e) => updateItem(index, 'grade', e.target.value)}
                        placeholder="e.g., Premium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Unit</Label>
                      <Select value={item.unit} onValueChange={(v) => updateItem(index, 'unit', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MT">MT (Metric Ton)</SelectItem>
                          <SelectItem value="KG">KG</SelectItem>
                          <SelectItem value="BAG">Bags</SelectItem>
                          <SelectItem value="UNIT">Units</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createStandingOrder.isPending}
          >
            {createStandingOrder.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Standing Order'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
