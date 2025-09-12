import React from 'react';
import { X, Trash2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { useNavigate } from 'react-router-dom';

interface CartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CartModal: React.FC<CartModalProps> = ({ open, onOpenChange }) => {
  const { items, totalItems, updateQuantity, removeItem, clearCart } = useShoppingCart();
  const navigate = useNavigate();

  const handleSignInToQuote = () => {
    onOpenChange(false);
    navigate('/customer-auth');
  };

  const handleClearCart = () => {
    clearCart();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-sm">📦</span>
              </div>
              <h2 className="text-xl font-semibold">
                Cart ({totalItems} item{totalItems !== 1 ? 's' : ''})
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🛒</span>
                </div>
                <p className="text-lg font-medium mb-2">Your cart is empty</p>
                <p className="text-sm">Add some products to get started</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground mb-2">
                        {item.productName}
                      </h3>
                      {item.productDescription && (
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                          {item.productDescription}
                        </p>
                      )}
                      {item.specifications && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Specifications:</span> {item.specifications}
                        </div>
                      )}
                      {item.preferredGrade && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Grade:</span> {item.preferredGrade}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-background rounded-lg border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="h-10 w-10 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[60px] text-center font-medium text-lg">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-10 w-10 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.unit}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          {items.length > 0 && (
            <div className="border-t p-6 space-y-3">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClearCart}
                  className="flex-1"
                >
                  Clear Cart
                </Button>
                <Button
                  onClick={handleSignInToQuote}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Sign In to Request Quote
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};