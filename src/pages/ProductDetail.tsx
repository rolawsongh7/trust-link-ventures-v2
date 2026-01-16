import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ShoppingCart, Heart, Package, Truck, CheckCircle, Share2 } from 'lucide-react';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteButton } from '@/components/customer/FavoriteButton';
import { useToast } from '@/hooks/use-toast';
import { ProductRecommendations } from '@/components/customer/ProductRecommendations';

interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  supplier: string;
  brand?: string;
  image_public_url?: string;
  slug: string;
  is_active: boolean;
}

const ProductDetail: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem: addToCart } = useShoppingCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addToCartOpen, setAddToCartOpen] = useState(false);
  const [cartData, setCartData] = useState({
    quantity: 1,
    unit: 'MT',
    specifications: '',
    preferredGrade: '',
  });

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;

      try {
        setLoading(true);
        
        // Try to find by ID first, then by slug
        let query = supabase
          .from('supplier_products')
          .select('*')
          .eq('is_active', true);

        // Check if productId is a UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(productId)) {
          query = query.eq('id', productId);
        } else {
          query = query.eq('slug', productId);
        }

        const { data, error } = await query.single();

        if (error) throw error;
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
        toast({
          variant: "destructive",
          title: "Product not found",
          description: "The requested product could not be found.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, toast]);

  const handleAddToCart = () => {
    if (!product) return;

    addToCart({
      productName: product.name,
      productDescription: product.description,
      quantity: cartData.quantity,
      unit: cartData.unit,
      specifications: cartData.specifications,
      preferredGrade: cartData.preferredGrade,
      imageUrl: product.image_public_url,
    });

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });

    setAddToCartOpen(false);
    setCartData({ quantity: 1, unit: 'MT', specifications: '', preferredGrade: '' });
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: `Check out ${product?.name} on Trust Link`,
          url,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Product link has been copied to clipboard.",
      });
    }
  };

  const getKeyFeatures = () => {
    if (!product) return [];
    
    if (product.category === 'Seafood') {
      return [
        { icon: <Package className="h-4 w-4" />, text: 'Premium quality' },
        { icon: <Truck className="h-4 w-4" />, text: 'Cold chain logistics' },
        { icon: <CheckCircle className="h-4 w-4" />, text: 'Export certified' },
      ];
    }
    if (product.category === 'Meat' || product.category === 'Meat & Poultry') {
      return [
        { icon: <Package className="h-4 w-4" />, text: 'Premium grade' },
        { icon: <Truck className="h-4 w-4" />, text: 'Temperature controlled' },
        { icon: <CheckCircle className="h-4 w-4" />, text: 'Quality certified' },
      ];
    }
    return [
      { icon: <Package className="h-4 w-4" />, text: 'High quality' },
      { icon: <Truck className="h-4 w-4" />, text: 'Reliable shipping' },
      { icon: <CheckCircle className="h-4 w-4" />, text: 'Export ready' },
    ];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--tl-bg))] to-white dark:from-slate-950 dark:to-slate-900 pt-safe pb-safe">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <Skeleton className="h-10 w-24" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--tl-bg))] to-white dark:from-slate-950 dark:to-slate-900 pt-safe pb-safe">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Card className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Product not found</h2>
            <p className="text-muted-foreground mb-4">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/portal/catalog')}>
              Browse Catalog
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const features = getKeyFeatures();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--tl-bg))] to-white dark:from-slate-950 dark:to-slate-900 pt-safe pb-safe">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="group">
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Catalog
        </Button>

        {/* Product Content */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="relative">
            <div className="aspect-square rounded-xl bg-white dark:bg-slate-800 border border-[hsl(var(--tl-border))] overflow-hidden">
              {product.image_public_url ? (
                <img
                  src={product.image_public_url}
                  alt={product.name}
                  className="w-full h-full object-contain p-6"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground/30" />
                </div>
              )}
            </div>
            
            {/* Action buttons on image */}
            <div className="absolute top-4 right-4 flex gap-2">
              <FavoriteButton
                isFavorite={isFavorite(product.id)}
                onToggle={() => toggleFavorite(product.id)}
                size="lg"
                className="bg-white/90 dark:bg-slate-800/90 shadow-md"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="h-12 w-12 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-md"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{product.category}</Badge>
                {product.supplier && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {product.supplier}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-[hsl(var(--tl-text-primary))]">
                {product.name}
              </h1>
            </div>

            {product.description && (
              <p className="text-[hsl(var(--tl-text-secondary))] leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Key Features */}
            <div className="flex flex-wrap gap-3">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--tl-bg))] text-sm"
                >
                  <span className="text-primary">{feature.icon}</span>
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Availability */}
            <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                Availability confirmed during quoting
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 bg-tl-gradient hover:opacity-95"
                onClick={() => setAddToCartOpen(true)}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <ProductRecommendations
          currentProductId={product.id}
          currentCategory={product.category}
        />
      </div>

      {/* Add to Cart Dialog */}
      <Dialog open={addToCartOpen} onOpenChange={setAddToCartOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add to Cart</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              {product.image_public_url && (
                <img
                  src={product.image_public_url}
                  alt={product.name}
                  className="w-16 h-16 object-contain rounded-lg bg-slate-100"
                />
              )}
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">{product.category}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={cartData.quantity}
                  onChange={(e) => setCartData(prev => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 1
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={cartData.unit}
                  onValueChange={(value) => setCartData(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MT">MT (Metric Ton)</SelectItem>
                    <SelectItem value="KG">KG (Kilogram)</SelectItem>
                    <SelectItem value="LB">LB (Pound)</SelectItem>
                    <SelectItem value="Units">Units</SelectItem>
                    <SelectItem value="Boxes">Boxes</SelectItem>
                    <SelectItem value="Pallets">Pallets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Preferred Grade (optional)</Label>
              <Input
                id="grade"
                placeholder="e.g., Grade A, Premium"
                value={cartData.preferredGrade}
                onChange={(e) => setCartData(prev => ({
                  ...prev,
                  preferredGrade: e.target.value
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specs">Specifications (optional)</Label>
              <Textarea
                id="specs"
                placeholder="Any specific requirements..."
                value={cartData.specifications}
                onChange={(e) => setCartData(prev => ({
                  ...prev,
                  specifications: e.target.value
                }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToCartOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddToCart}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetail;
