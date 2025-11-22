import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { isNativeApp } from '@/utils/env';

interface FloatingCartProps {
  onRequestQuote: () => void;
}

export const FloatingCart: React.FC<FloatingCartProps> = ({ onRequestQuote }) => {
  const { totalItems } = useShoppingCart();
  const native = isNativeApp();

  // Hide in native apps - use bottom tab bar instead
  if (native || totalItems === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 pb-safe pr-safe">
      <div className="relative">
        <Button 
          onClick={onRequestQuote}
          className="rounded-full w-14 h-14 bg-tl-gradient hover:opacity-95 text-white shadow-lg hover:shadow-xl transition-all min-h-[44px] min-w-[44px]"
          size="icon"
        >
          <ShoppingCart className="h-6 w-6" />
        </Button>
        {totalItems > 0 && (
          <Badge 
            className="absolute -top-2 -right-2 bg-tl-danger text-white min-w-[20px] h-5 text-xs flex items-center justify-center rounded-full shadow-md animate-bounce-in"
          >
            {totalItems}
          </Badge>
        )}
      </div>
    </div>
  );
};