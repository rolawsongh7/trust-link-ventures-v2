import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  supplier: string;
  brand?: string;
  image_public_url?: string;
  slug: string;
}

interface ProductCardProps {
  product: Product;
  onRequestQuote?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onRequestQuote }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [grade, setGrade] = useState('');
  const [requirements, setRequirements] = useState('');
  const { addItem } = useShoppingCart();
  const { toast } = useToast();

  const handleAddToCart = () => {
    if (!quantity) {
      toast({
        title: "Quantity Required",
        description: "Please enter a quantity before adding to cart.",
        variant: "destructive",
      });
      return;
    }

    addItem({
      productName: product.name,
      productDescription: product.description,
      quantity: parseFloat(quantity),
      unit,
      preferredGrade: grade || undefined,
      specifications: requirements || undefined,
      imageUrl: product.image_public_url
    });

    toast({
      title: "Added to Cart",
      description: `${quantity} ${unit} of ${product.name} added to cart.`,
    });

    // Reset form
    setQuantity('');
    setGrade('');
    setRequirements('');
    setIsExpanded(false);
  };

  const getDefaultImage = () => {
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&h=600';
  };

  const getBadgeText = () => {
    if (product.category === 'Seafood') return 'Shore Frozen';
    if (product.category === 'Meat' || product.category === 'Meat & Poultry') return 'Premium Cut';
    return 'Quality Product';
  };

  const cleanDescription = (description?: string) => {
    if (!description) return '';
    
    // Remove unwanted elements from scraped content
    return description
      .replace(/\[Back to top\]/gi, '') // Remove "[Back to top]" text
      .replace(/\(https?:\/\/[^\s)]+\)/g, '') // Remove URLs in parentheses
      .replace(/https?:\/\/[^\s]+/g, '') // Remove standalone URLs
      .replace(/\\"[^"]*\\"/g, '') // Remove quoted strings that might be navigation
      .replace(/Menu$/gi, '') // Remove "Menu" at the end
      .replace(/back to top/gi, '') // Remove variations of back to top
      .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing whitespace
  };

  const getKeyFeatures = () => {
    if (product.category === 'Seafood') {
      return [
        'Firm white flesh',
        'Mild flavor',
        'Nordic waters',
        'Traditional favorite'
      ];
    }
    if (product.category === 'Meat' || product.category === 'Meat & Poultry') {
      return [
        'Premium grade',
        'Fresh cut',
        'Quality sourced',
        'Export ready'
      ];
    }
    return [
      'High quality',
      'Export grade',
      'Fresh product',
      'Premium selection'
    ];
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-background border border-border">
      {/* Product Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={product.image_public_url || getDefaultImage()}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = getDefaultImage();
          }}
        />
        {/* Badge */}
        <div className="absolute top-4 left-4">
          <Badge className="bg-primary text-primary-foreground font-medium px-3 py-1">
            {getBadgeText()}
          </Badge>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Product Header */}
        <div className="mb-4">
          <div 
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              {product.name}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="mt-2">
            <Badge variant="secondary" className="text-sm">
              {product.supplier}
            </Badge>
          </div>
        </div>

        {/* Product Description */}
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {cleanDescription(product.description) || `Premium ${product.name.toLowerCase()} from ${product.supplier}. Export-quality product with firm texture and excellent flavor. Shore frozen to preserve freshness. Excellent for various culinary preparations.`}
        </p>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="space-y-6 animate-fade-in">
            {/* Key Features */}
            <div>
              <h4 className="font-semibold text-foreground mb-3">Key Features:</h4>
              <div className="grid grid-cols-2 gap-3">
                {getKeyFeatures().map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Add to Quote Request Form */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-foreground">Add to Quote Request:</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Unit
                  </label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="mt">MT</SelectItem>
                      <SelectItem value="lbs">lbs</SelectItem>
                      <SelectItem value="tons">tons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Preferred Grade (Optional)
                </label>
                <Input
                  placeholder="e.g., Grade A, Premium, etc."
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="h-10"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Special Requirements (Optional)
                </label>
                <Textarea
                  placeholder="Any specific requirements or notes..."
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <Button 
                onClick={handleAddToCart}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        )}

        {/* Collapsed State Actions */}
        {!isExpanded && (
          <div className="space-y-3">
            <div className="text-center">
              <h4 className="font-semibold text-primary text-lg">Contact for Pricing</h4>
            </div>
            
            <Button
              variant="outline"
              onClick={() => onRequestQuote?.(product)}
              className="w-full h-12 border-2"
            >
              Request Quote
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductCard;