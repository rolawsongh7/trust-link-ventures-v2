import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { useToast } from '@/hooks/use-toast';

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
  const [showDialog, setShowDialog] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('kg');
  const [specifications, setSpecifications] = useState('');
  const [preferredGrade, setPreferredGrade] = useState('');
  const { addItem } = useShoppingCart();
  const { toast } = useToast();

  const handleAddToCart = () => {
    addItem({
      productName,
      productDescription,
      quantity,
      unit,
      specifications,
      preferredGrade,
      imageUrl
    });

    toast({
      title: "Added to cart",
      description: `${productName} has been added to your cart`,
    });

    setShowDialog(false);
    // Reset form
    setQuantity(1);
    setUnit('kg');
    setSpecifications('');
    setPreferredGrade('');
  };

  return (
    <>
      <Button onClick={() => setShowDialog(true)} className="w-full" variant="default">
        <Plus className="h-4 w-4 mr-2" />
        Add to Cart
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add {productName} to Cart</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="tons">tons</SelectItem>
                    <SelectItem value="pieces">pieces</SelectItem>
                    <SelectItem value="boxes">boxes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="grade">Preferred Grade (Optional)</Label>
              <Input
                id="grade"
                placeholder="e.g., Premium, Grade A, etc."
                value={preferredGrade}
                onChange={(e) => setPreferredGrade(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="specifications">Specifications (Optional)</Label>
              <Textarea
                id="specifications"
                placeholder="Any specific requirements, size, packaging, etc."
                value={specifications}
                onChange={(e) => setSpecifications(e.target.value)}
                rows={3}
              />
            </div>
            
            <Button onClick={handleAddToCart} className="w-full">
              Add to Cart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};