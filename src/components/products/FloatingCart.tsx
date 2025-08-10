import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingCartProps {
  onRequestQuote: () => void;
}

export const FloatingCart: React.FC<FloatingCartProps> = ({ onRequestQuote }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button 
        onClick={onRequestQuote}
        className="rounded-full w-14 h-14 shadow-lg"
        size="icon"
      >
        <ShoppingCart className="h-6 w-6" />
      </Button>
    </div>
  );
};