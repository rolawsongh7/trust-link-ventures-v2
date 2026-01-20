import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Heart, Plus, ShoppingCart, ArrowRight, Sparkles, CheckSquare } from 'lucide-react';
import { PortalPageHeader } from '@/components/customer/PortalPageHeader';
import { FavoriteButton } from '@/components/customer/FavoriteButton';
import { FavoritesEmptyState } from '@/components/customer/empty-states';
import { useFavorites } from '@/hooks/useFavorites';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ToastAction } from '@/components/ui/toast';

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
  const navigate = useNavigate();
  const { favoriteProducts, loading, removeFavorite } = useFavorites();
  const { addItem } = useShoppingCart();
  const { toast } = useToast();
  
  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
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
  const [addingSelected, setAddingSelected] = useState(false);

  // Derived state
  const selectAll = useMemo(() => {
    return favoriteProducts.length > 0 && selectedItems.size === favoriteProducts.length;
  }, [favoriteProducts.length, selectedItems.size]);

  const toggleSelectItem = (productId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(favoriteProducts.map(p => p.id)));
    }
  };

  const handleAddSelectedToCart = async () => {
    if (selectedItems.size === 0) return;

    setAddingSelected(true);
    
    try {
      const productsToAdd = favoriteProducts.filter(p => selectedItems.has(p.id));
      for (const product of productsToAdd) {
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
        title: "Items added to cart",
        description: `${productsToAdd.length} product${productsToAdd.length > 1 ? 's' : ''} added to your cart.`,
        action: (
          <ToastAction altText="Go to Cart" onClick={() => navigate('/portal/cart')}>
            Go to Cart
          </ToastAction>
        ),
      });
      
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Error adding selected to cart:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add some products to cart.",
      });
    } finally {
      setAddingSelected(false);
    }
  };

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
      action: (
        <ToastAction altText="Go to Cart" onClick={() => navigate('/portal/cart')}>
          Go to Cart
        </ToastAction>
      ),
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-32 md:pb-6 space-y-6">
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

      {/* Empty State */}
      {favoriteProducts.length === 0 ? (
        <FavoritesEmptyState />
      ) : (
        <>
          {/* Selection Controls & Quick Reorder */}
          <Card className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-200 dark:border-rose-800">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col gap-4">
                {/* Selection Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="select-all"
                      checked={selectAll}
                      onCheckedChange={toggleSelectAll}
                      className="border-rose-300 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                      aria-label="Select all favorites"
                    />
                    <label 
                      htmlFor="select-all" 
                      className="text-sm font-medium text-tl-text cursor-pointer select-none"
                    >
                      {selectAll ? 'Deselect All' : 'Select All'}
                    </label>
                    {selectedItems.size > 0 && (
                      <span className="text-sm text-rose-600 dark:text-rose-400 font-medium">
                        ({selectedItems.size} selected)
                      </span>
                    )}
                  </div>
                  
                  {/* Desktop Add Selected Button */}
                  <Button
                    onClick={handleAddSelectedToCart}
                    disabled={selectedItems.size === 0 || addingSelected}
                    className="hidden md:flex bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
                  >
                    {addingSelected ? (
                      <>Adding...</>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Add Selected to Cart ({selectedItems.size})
                      </>
                    )}
                  </Button>
                </div>

                {/* Quick Reorder Info */}
                <div className="flex items-center gap-3 pt-2 border-t border-rose-200 dark:border-rose-800">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm text-tl-muted">
                    Select products above, then add them to your cart with one click
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {favoriteProducts.map((product) => {
              const isSelected = selectedItems.has(product.id);
              return (
                <article 
                  key={product.id} 
                  className={`bg-tl-surface border-2 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden relative
                    ${isSelected 
                      ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-800' 
                      : 'border-tl-border border-l-4 border-l-rose-400'
                    }`}
                >
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectItem(product.id)}
                      className="bg-white/90 dark:bg-slate-800/90 border-rose-300 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500 w-5 h-5"
                      aria-label={`Select ${product.name}`}
                    />
                  </div>

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
                    <div 
                      className="h-40 w-full overflow-hidden cursor-pointer"
                      onClick={() => toggleSelectItem(product.id)}
                    >
                      <img
                        src={product.image_public_url}
                        alt={product.name}
                        className="w-full h-full object-contain p-4 hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  
                  <div className="px-4 pb-4">
                    <h3 className="text-tl-text font-semibold text-lg mb-2 line-clamp-2 pr-8 pl-6">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-tl-muted text-sm mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex gap-2 mb-3">
                      <span className="inline-flex px-3 py-1 text-sm rounded-full bg-blue-50 dark:bg-blue-950/30 text-tl-accent font-medium">
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
              );
            })}
          </div>

          {/* View Catalog CTA */}
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
        </>
      )}

      {/* Mobile Sticky Bottom Bar */}
      {favoriteProducts.length > 0 && (
        <div className="fixed bottom-[80px] left-0 right-0 p-4 bg-tl-surface/95 backdrop-blur-md border-t border-tl-border md:hidden z-40 safe-area-pb shadow-lg">
          <div className="flex gap-3 max-w-lg mx-auto">
            <Button
              onClick={handleAddSelectedToCart}
              disabled={selectedItems.size === 0 || addingSelected}
              className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white min-h-[48px]"
            >
              {addingSelected ? (
                <>Adding...</>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add Selected ({selectedItems.size})
                </>
              )}
            </Button>
            <Button 
              asChild 
              variant="outline" 
              className="min-h-[48px] border-tl-border"
            >
              <Link to="/portal/cart">
                View Cart
              </Link>
            </Button>
          </div>
        </div>
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
