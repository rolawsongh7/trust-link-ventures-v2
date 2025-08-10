import React from 'react';
import { ShoppingCart as CartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShoppingCartProps {
  onRequestQuote: () => void;
}

export const ShoppingCart: React.FC<ShoppingCartProps> = ({ onRequestQuote }) => {
  return (
    <Button onClick={onRequestQuote} className="flex items-center gap-2">
      <CartIcon className="h-4 w-4" />
      Shopping Cart
    </Button>
  );
};