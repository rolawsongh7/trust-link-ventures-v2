import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Calendar, RefreshCw, MessageSquare, Minus, Plus } from 'lucide-react';
import { useQuoteRevisions, RequestType, RevisionRequest } from '@/hooks/useQuoteRevisions';

interface QuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price?: number;
  total_price?: number;
}

interface RequestChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteNumber: string;
  items: QuoteItem[];
  onSuccess?: () => void;
}

export const RequestChangeModal: React.FC<RequestChangeModalProps> = ({
  open,
  onOpenChange,
  quoteId,
  quoteNumber,
  items,
  onSuccess,
}) => {
  const { submitRevisionRequest, submitting } = useQuoteRevisions();
  const [requestType, setRequestType] = useState<RequestType>('quantity_change');
  const [quantityChanges, setQuantityChanges] = useState<Record<string, number>>({});
  const [swapNotes, setSwapNotes] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [otherNotes, setOtherNotes] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  const handleQuantityChange = (itemId: string, originalQty: number, delta: number) => {
    const currentQty = quantityChanges[itemId] ?? originalQty;
    const newQty = Math.max(0, currentQty + delta);
    setQuantityChanges(prev => ({ ...prev, [itemId]: newQty }));
  };

  const hasQuantityChanges = Object.entries(quantityChanges).some(
    ([itemId, qty]) => {
      const item = items.find(i => i.id === itemId);
      return item && qty !== item.quantity;
    }
  );

  const handleSubmit = async () => {
    const request: RevisionRequest = {
      request_type: requestType,
      customer_note: customerNote || undefined,
    };

    switch (requestType) {
      case 'quantity_change':
        request.quantity_changes = Object.entries(quantityChanges)
          .filter(([itemId, qty]) => {
            const item = items.find(i => i.id === itemId);
            return item && qty !== item.quantity;
          })
          .map(([itemId, qty]) => {
            const item = items.find(i => i.id === itemId)!;
            return {
              item_id: itemId,
              product_name: item.product_name,
              original_quantity: item.quantity,
              requested_quantity: qty,
              unit: item.unit,
            };
          });
        break;
      
      case 'swap_items':
        request.swap_items = swapNotes ? [{
          original_item_id: '',
          original_product_name: '',
          new_product_name: swapNotes,
          quantity: 0,
          unit: '',
          notes: swapNotes,
        }] : undefined;
        break;
      
      case 'delivery_change':
        request.delivery_change = {
          delivery_notes: deliveryNotes,
        };
        break;
      
      case 'other':
        request.other_notes = otherNotes;
        break;
    }

    const success = await submitRevisionRequest(quoteId, request);
    
    if (success) {
      // Reset form
      setQuantityChanges({});
      setSwapNotes('');
      setDeliveryNotes('');
      setOtherNotes('');
      setCustomerNote('');
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const canSubmit = () => {
    switch (requestType) {
      case 'quantity_change':
        return hasQuantityChanges;
      case 'swap_items':
        return swapNotes.trim().length > 0;
      case 'delivery_change':
        return deliveryNotes.trim().length > 0;
      case 'other':
        return otherNotes.trim().length > 0;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Request Changes - {quoteNumber}
          </DialogTitle>
          <DialogDescription>
            Tell us what changes you'd like to make. We'll review and send you a revised quote.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Request Type Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">What would you like to change?</Label>
              <RadioGroup
                value={requestType}
                onValueChange={(value) => setRequestType(value as RequestType)}
                className="grid grid-cols-2 gap-3"
              >
                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  requestType === 'quantity_change' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}>
                  <RadioGroupItem value="quantity_change" className="sr-only" />
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Quantities</div>
                    <div className="text-xs text-muted-foreground">Adjust item amounts</div>
                  </div>
                </label>
                
                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  requestType === 'swap_items' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}>
                  <RadioGroupItem value="swap_items" className="sr-only" />
                  <RefreshCw className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Swap Items</div>
                    <div className="text-xs text-muted-foreground">Replace products</div>
                  </div>
                </label>
                
                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  requestType === 'delivery_change' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}>
                  <RadioGroupItem value="delivery_change" className="sr-only" />
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Delivery</div>
                    <div className="text-xs text-muted-foreground">Date or location</div>
                  </div>
                </label>
                
                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  requestType === 'other' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}>
                  <RadioGroupItem value="other" className="sr-only" />
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Other</div>
                    <div className="text-xs text-muted-foreground">Something else</div>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Quantity Changes */}
            {requestType === 'quantity_change' && (
              <div className="space-y-3">
                <Label className="text-base font-medium">Adjust Quantities</Label>
                <div className="space-y-2">
                  {items.map((item) => {
                    const currentQty = quantityChanges[item.id] ?? item.quantity;
                    const hasChanged = currentQty !== item.quantity;
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          hasChanged ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Original: {item.quantity} {item.unit}
                            {hasChanged && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                → {currentQty} {item.unit}
                              </Badge>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={currentQty}
                            onChange={(e) => setQuantityChanges(prev => ({
                              ...prev,
                              [item.id]: parseInt(e.target.value) || 0
                            }))}
                            className="w-20 text-center h-8"
                            min={0}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Swap Items */}
            {requestType === 'swap_items' && (
              <div className="space-y-3">
                <Label className="text-base font-medium">Describe the swap</Label>
                <Textarea
                  value={swapNotes}
                  onChange={(e) => setSwapNotes(e.target.value)}
                  placeholder="E.g., Replace 10 tons of Cod with 10 tons of Haddock"
                  className="min-h-[100px]"
                />
              </div>
            )}

            {/* Delivery Change */}
            {requestType === 'delivery_change' && (
              <div className="space-y-3">
                <Label className="text-base font-medium">Delivery changes</Label>
                <Textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="E.g., Change delivery date to next Friday, or update delivery instructions"
                  className="min-h-[100px]"
                />
              </div>
            )}

            {/* Other */}
            {requestType === 'other' && (
              <div className="space-y-3">
                <Label className="text-base font-medium">Describe your request</Label>
                <Textarea
                  value={otherNotes}
                  onChange={(e) => setOtherNotes(e.target.value)}
                  placeholder="Tell us what changes you'd like to make..."
                  className="min-h-[100px]"
                />
              </div>
            )}

            {/* Additional Notes */}
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base font-medium">Additional notes (optional)</Label>
              <Textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Any other information that might help us process your request..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
