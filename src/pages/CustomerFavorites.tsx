import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Package, Plus, ShoppingCart, ArrowRight, Sparkles } from 'lucide-react';
import { PortalPageHeader } from '@/components/customer/PortalPageHeader';
import { FavoriteButton } from '@/components/customer/FavoriteButton';
import { FavoritesEmptyState } from '@/components/customer/empty-states';
import { useFavorites } from '@/hooks/useFavorites';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface CartItemData {
  productName: string;
  productDescription?: string;
  quantity: number;
  unit: string;
  specifications?: string;
  preferredGrade?: string;
  imageUrl?: string;
}

const CustomerFavorites = () => {
  const { favoriteProducts, loading, removeFavorite } = useFavorites();
  const { addItem } = useShoppingCart();
  const { toast } = useToast();
  
  // Add to cart dialog state
  const [selectedProduct, setSelectedProduct] = useState<typeof favoriteProducts[0] | null>(null);
  const [cartData, setCartData] = useState<CartItemData>({
    productName: '',
    productDescription: '',
    quantity: 1,
    unit: 'kg',
    specifications: '',
    preferredGrade: '',
    imageUrl: ''
  });
  const [addingAll, setAddingAll] = useState(false);

  const openAddToCartDialog = (product: typeof favoriteProducts[0]) => {
    setSelectedProduct(product);
    setCartData({
      productName: product.name,
      productDescription: product.description,
      quantity: 1,
      unit: 'kg',
      specifications: '',
      preferredGrade: '',
      imageUrl: product.image_public_url
    });
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    addItem({
      productName: cartData.productName,
      productDescription: cartData.productDescription,
      quantity: cartData.quantity,
      unit: cartData.unit,
      specifications: cartData.specifications,
      preferredGrade: cartData.preferredGrade,
      imageUrl: cartData.imageUrl
    });

    toast({
      title: "Added to cart",
      description: `${cartData.productName} has been added to your cart.`,
    });

    setSelectedProduct(null);
    setCartData({
      productName: '',
      productDescription: '',
      quantity: 1,
      unit: 'kg',
      specifications: '',
      preferredGrade: '',
      imageUrl: ''
    });
  };

  const handleAddAllToCart = async () => {
    if (favoriteProducts.length === 0) return;

    setAddingAll(true);
    
    try {
      for (const product of favoriteProducts) {
        addItem({
          productName: product.name,
          productDescription: product.description,
          quantity: 1,
          unit: 'kg',
          specifications: '',
          preferredGrade: '',
          imageUrl: product.image_public_url
        });
      }

      toast({
        title: "Favorites added to cart",
        description: `${favoriteProducts.length} product${favoriteProducts.length > 1 ? 's' : ''} added to your cart.`,
      });
    } catch (error) {
      console.error('Error adding all to cart:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add some products to cart.",
      });
    } finally {
      setAddingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <Skeleton className="h-32 w-full rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
      {/* Header */}
      <Card className="overflow-hidden">
        <PortalPageHeader
          title="Your Favorites"
          subtitle="Products you've saved for quick access"
          totalCount={favoriteProducts.length}
          totalIcon={Heart}
          patternId="favorites-grid"
        />
      </Card>

      {/* Add All to Cart CTA */}
      {favoriteProducts.length > 0 && (
        <Card className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-200 dark:border-rose-800">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-tl-text">Quick Reorder</h3>
                  <p className="text-sm text-tl-muted">
                    Add all your favorites to cart with one click
                  </p>
                </div>
              </div>
              <Button
                onClick={handleAddAllToCart}
                disabled={addingAll}
                className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
              >
                {addingAll ? (
                  <>Adding...</>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add All to Cart ({favoriteProducts.length})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {favoriteProducts.length === 0 ? (
        <FavoritesEmptyState />
      ) : (
        /* Products Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {favoriteProducts.map((product) => (
            <article 
              key={product.id} 
              className="bg-tl-surface border border-tl-border border-l-4 border-l-rose-400 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden relative"
            >
              {/* Favorite Button */}
              <div className="absolute top-2 right-2 z-10">
                <FavoriteButton
                  isFavorite={true}
                  onToggle={() => removeFavorite(product.id)}
                  size="md"
                  className="bg-white/90 dark:bg-slate-800/90 shadow-sm"
                />
              </div>

              {product.image_public_url && (
                <div className="h-40 w-full overflow-hidden">
                  <img
                    src={product.image_public_url}
                    alt={product.name}
                    className="w-full h-full object-contain p-4 hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              
              <div className="px-4 pb-4">
                <h3 className="text-tl-text font-semibold text-lg mb-2 line-clamp-2 pr-8">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-tl-muted text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}
                <div className="flex gap-2 mb-3">
                  <span className="inline-flex px-3 py-1 text-sm rounded-full bg-blue-50 text-tl-accent font-medium">
                    {product.category}
                  </span>
                </div>
                
                <Button 
                  onClick={() => openAddToCartDialog(product)}
                  className="w-full py-2 rounded-lg shadow-md bg-tl-gradient hover:opacity-95 font-medium text-white min-h-[44px]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* View Catalog CTA */}
      {favoriteProducts.length > 0 && (
        <Card className="bg-tl-surface border-tl-border">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div>
                <h3 className="font-semibold text-tl-text">Looking for more?</h3>
                <p className="text-sm text-tl-muted">
                  Browse our full catalog to discover new products
                </p>
              </div>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to="/portal/catalog">
                  Browse Catalog
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add to Cart Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md bg-tl-surface/95 backdrop-blur-md border-tl-border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-tl-text text-lg">
              Add to Cart: {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="quantity" className="text-sm font-medium text-tl-text">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={cartData.quantity}
                  onChange={(e) => setCartData({ ...cartData, quantity: parseInt(e.target.value) || 1 })}
                  className="border-tl-border focus:ring-2 focus:ring-tl-accent/40 focus:border-tl-accent px-3 py-2"
                />
              </div>
              <div>
                <Label htmlFor="unit" className="text-sm font-medium text-tl-text">Unit</Label>
                <Select value={cartData.unit} onValueChange={(value) => setCartData({ ...cartData, unit: value })}>
                  <SelectTrigger className="border-tl-border focus:ring-2 focus:ring-tl-accent/40 px-3 py-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="tonnes">Tonnes</SelectItem>
                    <SelectItem value="pieces">Pieces</SelectItem>
                    <SelectItem value="boxes">Boxes</SelectItem>
                    <SelectItem value="cartons">Cartons</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="grade" className="text-sm font-medium text-tl-text">Preferred Grade (Optional)</Label>
              <Select value={cartData.preferredGrade} onValueChange={(value) => setCartData({ ...cartData, preferredGrade: value })}>
                <SelectTrigger className="border-tl-border focus:ring-2 focus:ring-tl-accent/40 px-3 py-2">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="grade-a">Grade A</SelectItem>
                  <SelectItem value="grade-b">Grade B</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="specifications" className="text-sm font-medium text-tl-text">Specifications (Optional)</Label>
              <Textarea
                id="specifications"
                placeholder="Any specific requirements, size, packaging, etc."
                value={cartData.specifications}
                onChange={(e) => setCartData({ ...cartData, specifications: e.target.value })}
                rows={3}
                className="border-tl-border focus:ring-2 focus:ring-tl-accent/40 focus:border-tl-accent px-3 py-2"
              />
            </div>
            
            <Button 
              onClick={handleAddToCart} 
              className="w-full py-3 rounded-lg shadow-md bg-tl-gradient hover:opacity-95 font-semibold text-white"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerFavorites;
