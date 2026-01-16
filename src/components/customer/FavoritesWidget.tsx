import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Plus, ArrowRight, ShoppingCart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useFavorites } from '@/hooks/useFavorites';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { useToast } from '@/hooks/use-toast';

export const FavoritesWidget: React.FC = () => {
  const { favoriteProducts, loading } = useFavorites();
  const { addItem } = useShoppingCart();
  const { toast } = useToast();

  // Show top 5 favorites
  const displayProducts = favoriteProducts.slice(0, 5);

  const handleQuickAdd = (product: typeof favoriteProducts[0]) => {
    addItem({
      productName: product.name,
      productDescription: product.description,
      quantity: 1,
      unit: 'kg',
      specifications: '',
      preferredGrade: '',
      imageUrl: product.image_public_url
    });

    toast({
      title: "Added to cart",
      description: `${product.name} added with default quantity.`,
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-40 rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (favoriteProducts.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-200/50 dark:border-rose-800/50">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
              <Heart className="w-7 h-7 text-rose-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-tl-text mb-1">Your Favorites</h3>
              <p className="text-sm text-tl-muted">
                Save products you buy often for quick reordering
              </p>
            </div>
            <Button asChild variant="outline" className="w-full sm:w-auto border-rose-200 hover:bg-rose-50">
              <Link to="/portal/catalog">
                <Sparkles className="w-4 h-4 mr-2" />
                Browse Catalog
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between px-0">
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-[#0f2f57] dark:text-white">
          Your Favorites
        </h2>
        <Link 
          to="/portal/favorites" 
          className="text-sm font-medium text-[#0077B6] dark:text-[#2AA6FF] hover:underline
                     min-h-[44px] min-w-[44px] flex items-center gap-1 focus-maritime"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Horizontal scroll of favorites */}
      <ScrollArea className="w-full whitespace-nowrap rounded-xl">
        <div className="flex gap-4 pb-4">
          {displayProducts.map((product) => (
            <Card 
              key={product.id}
              className="w-40 sm:w-48 flex-shrink-0 bg-tl-surface border-tl-border 
                         hover:shadow-lg transition-all duration-200 overflow-hidden group"
            >
              {/* Image */}
              {product.image_public_url ? (
                <div className="h-24 sm:h-28 w-full overflow-hidden bg-slate-50 dark:bg-slate-800">
                  <img
                    src={product.image_public_url}
                    alt={product.name}
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="h-24 sm:h-28 w-full bg-gradient-to-br from-rose-50 to-pink-50 
                                dark:from-rose-950/20 dark:to-pink-950/20 
                                flex items-center justify-center">
                  <Heart className="w-8 h-8 text-rose-300" />
                </div>
              )}

              {/* Content */}
              <CardContent className="p-3">
                <h4 className="font-medium text-sm text-tl-text line-clamp-2 mb-2 whitespace-normal min-h-[40px]">
                  {product.name}
                </h4>
                <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-blue-50 text-tl-accent font-medium mb-3">
                  {product.category}
                </span>
                <Button
                  size="sm"
                  onClick={() => handleQuickAdd(product)}
                  className="w-full bg-tl-gradient hover:opacity-95 text-white text-xs h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* View All Card */}
          {favoriteProducts.length > 5 && (
            <Link 
              to="/portal/favorites"
              className="w-40 sm:w-48 flex-shrink-0 rounded-xl border-2 border-dashed border-rose-200 
                         dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/10
                         flex flex-col items-center justify-center gap-3
                         hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors
                         min-h-[180px]"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 
                              flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-rose-500" />
              </div>
              <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
                +{favoriteProducts.length - 5} more
              </span>
            </Link>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
