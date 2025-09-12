import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShoppingCart } from '@/hooks/useShoppingCart';

interface FloatingCartProps {
  onRequestQuote: () => void;
}

export const FloatingCart: React.FC<FloatingCartProps> = ({ onRequestQuote }) => {
  const { totalItems } = useShoppingCart();

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative">
        <Button 
          onClick={onRequestQuote}
          className="rounded-full w-14 h-14 shadow-lg"
          size="icon"
        >
          <ShoppingCart className="h-6 w-6" />
        </Button>
        {totalItems > 0 && (
          <Badge 
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground min-w-[20px] h-5 text-xs flex items-center justify-center"
          >
            {totalItems}
          </Badge>
        )}
      </div>
    </div>
  );
};