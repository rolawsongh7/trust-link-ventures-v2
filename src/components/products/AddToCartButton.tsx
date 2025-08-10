import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AddToCartButtonProps {
  productName: string;
  productDescription: string;
  imageUrl: string;
  'data-product-name'?: string;
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({ 
  productName, 
  productDescription, 
  imageUrl 
}) => {
  const handleAddToCart = () => {
    // Add to cart logic here
    console.log('Added to cart:', { productName, productDescription, imageUrl });
  };

  return (
    <Button onClick={handleAddToCart} className="w-full" variant="default">
      <Plus className="h-4 w-4 mr-2" />
      Add to Cart
    </Button>
  );
};