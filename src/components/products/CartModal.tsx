import React from 'react';
import { X, Trash2, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { CustomerAuthModal } from '@/components/customer/CustomerAuthModal';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useNavigate } from 'react-router-dom';

interface CartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CartModal: React.FC<CartModalProps> = ({ open, onOpenChange }) => {
  const { items, totalItems, updateQuantity, removeItem, clearCart } = useShoppingCart();
  const { user } = useCustomerAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  const handleSignInToQuote = () => {
    if (user) {
      // User is already authenticated, redirect to customer cart
      onOpenChange(false);
      navigate('/customer/cart');
    } else {
      // User needs to authenticate
      setShowAuthModal(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    onOpenChange(false);
    navigate('/customer/cart');
  };

  const handleClearCart = () => {
    clearCart();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 overflow-hidden bg-tl-surface/95 backdrop-blur-md border-tl-border shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-tl-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-tl-accent/10 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-tl-accent" />
              </div>
              <h2 className="text-xl font-semibold text-tl-text">
                Cart ({totalItems} item{totalItems !== 1 ? 's' : ''})
              </h2>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)}
              className="hover:bg-tl-border/20 min-h-[44px] min-w-[44px]"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-tl-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="h-8 w-8 text-tl-accent" />
                </div>
                <p className="text-lg font-medium text-tl-text mb-2">Your cart is empty</p>
                <p className="text-sm text-tl-muted">Add some products to get started</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="bg-tl-border/20 rounded-lg p-4 border border-tl-border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-tl-text mb-2">
                        {item.productName}
                      </h3>
                      {item.productDescription && (
                        <p className="text-sm text-tl-muted leading-relaxed mb-3">
                          {item.productDescription}
                        </p>
                      )}
                      {item.specifications && (
                        <div className="text-sm text-tl-muted mb-1">
                          <span className="font-medium text-tl-text">Specifications:</span> {item.specifications}
                        </div>
                      )}
                      {item.preferredGrade && (
                        <div className="text-sm text-tl-muted">
                          <span className="font-medium text-tl-text">Grade:</span> {item.preferredGrade}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-tl-danger hover:text-tl-danger hover:bg-tl-danger-bg min-h-[44px] min-w-[44px]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-tl-surface rounded-lg border border-tl-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="h-10 w-10 p-0 hover:bg-tl-border/20 min-h-[44px] min-w-[44px]"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[60px] text-center font-medium text-lg text-tl-text">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-10 w-10 p-0 hover:bg-tl-border/20 min-h-[44px] min-w-[44px]"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-sm text-tl-muted">
                      {item.unit}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          {items.length > 0 && (
            <div className="border-t border-tl-border p-6 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={handleClearCart}
                  className="flex-1 border-tl-border hover:bg-tl-border/20 min-h-[44px]"
                >
                  Clear Cart
                </Button>
                <Button
                  onClick={handleSignInToQuote}
                  className="flex-1 bg-tl-gradient hover:opacity-95 text-white shadow-md min-h-[44px]"
                >
                  Sign In to Request Quote
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Customer Auth Modal */}
      <CustomerAuthModal 
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={handleAuthSuccess}
      />
    </Dialog>
  );
};