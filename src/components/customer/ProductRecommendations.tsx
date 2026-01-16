import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ShoppingCart, TrendingUp, Sparkles, ArrowRight, Package } from 'lucide-react';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteButton } from './FavoriteButton';
import { useToast } from '@/hooks/use-toast';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';

interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  supplier: string;
  image_public_url?: string;
  slug: string;
}

interface ProductRecommendationsProps {
  currentProductId?: string;
  currentCategory?: string;
  showFrequentlyOrdered?: boolean;
  showPersonalized?: boolean;
  maxItems?: number;
}

export const ProductRecommendations: React.FC<ProductRecommendationsProps> = ({
  currentProductId,
  currentCategory,
  showFrequentlyOrdered = true,
  showPersonalized = true,
  maxItems = 8,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useCustomerAuth();
  const { addItem: addToCart } = useShoppingCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const [frequentlyOrdered, setFrequentlyOrdered] = useState<Product[]>([]);
  const [personalizedRecs, setPersonalizedRecs] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);

        // Fetch all active products
        const { data: allProducts, error: productsError } = await supabase
          .from('supplier_products')
          .select('id, name, description, category, supplier, image_public_url, slug')
          .eq('is_active', true);

        if (productsError) throw productsError;

        // Exclude current product
        const filteredProducts = (allProducts || []).filter(
          p => p.id !== currentProductId
        );

        // Frequently Ordered: Get order items count
        const { data: orderItemsData, error: orderError } = await supabase
          .from('order_items')
          .select('product_name');

        if (!orderError && orderItemsData) {
          // Count product name occurrences
          const productCounts = new Map<string, number>();
          orderItemsData.forEach(item => {
            const count = productCounts.get(item.product_name) || 0;
            productCounts.set(item.product_name, count + 1);
          });

          // Match with products and sort by count
          const scored = filteredProducts.map(product => ({
            product,
            score: productCounts.get(product.name) || 0,
          }));

          scored.sort((a, b) => b.score - a.score);
          setFrequentlyOrdered(scored.slice(0, maxItems).map(s => s.product));
        } else {
          // Fallback: Just show products from similar categories
          const categoryProducts = filteredProducts.filter(
            p => p.category === currentCategory
          );
          setFrequentlyOrdered(
            categoryProducts.length > 0 
              ? categoryProducts.slice(0, maxItems)
              : filteredProducts.slice(0, maxItems)
          );
        }

        // Personalized: Based on user's order history
        if (showPersonalized && profile?.email) {
          // Get customer's order history
          const { data: customerOrders, error: customerOrdersError } = await supabase
            .from('orders')
            .select(`
              id,
              order_items (product_name)
            `)
            .limit(10);

          if (!customerOrdersError && customerOrders) {
            // Get categories from order history
            const orderedProductNames = new Set<string>();
            customerOrders.forEach(order => {
              (order.order_items || []).forEach((item: any) => {
                orderedProductNames.add(item.product_name);
              });
            });

            // Find products in same categories that haven't been ordered
            const orderedCategories = new Set<string>();
            filteredProducts.forEach(p => {
              if (orderedProductNames.has(p.name)) {
                orderedCategories.add(p.category);
              }
            });

            // Recommend from same categories but not ordered before
            const personalized = filteredProducts.filter(
              p => orderedCategories.has(p.category) && !orderedProductNames.has(p.name)
            );

            if (personalized.length >= 4) {
              setPersonalizedRecs(personalized.slice(0, maxItems));
            } else {
              // Not enough personalized - use category-based fallback
              const categoryRecs = filteredProducts.filter(
                p => p.category === currentCategory
              );
              setPersonalizedRecs(
                categoryRecs.length > 0 
                  ? categoryRecs.slice(0, maxItems) 
                  : filteredProducts.slice(0, maxItems)
              );
            }
          }
        } else {
          // Not logged in - use category-based recommendations
          const categoryRecs = filteredProducts.filter(
            p => p.category === currentCategory
          );
          setPersonalizedRecs(
            categoryRecs.length > 0 
              ? categoryRecs.slice(0, maxItems) 
              : []
          );
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [currentProductId, currentCategory, profile?.email, maxItems, showPersonalized]);

  const handleQuickAdd = (product: Product) => {
    addToCart({
      productName: product.name,
      productDescription: product.description,
      quantity: 1,
      unit: 'MT',
      imageUrl: product.image_public_url,
    });

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const ProductCard = ({ product }: { product: Product }) => (
    <div
      className="group relative flex-shrink-0 w-[200px] md:w-[240px] bg-white dark:bg-slate-900 rounded-xl border border-[hsl(var(--tl-border))] overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => navigate(`/portal/catalog/${product.id}`)}
    >
      {/* Favorite Button */}
      <div className="absolute top-2 right-2 z-10">
        <FavoriteButton
          isFavorite={isFavorite(product.id)}
          onToggle={() => toggleFavorite(product.id)}
          size="sm"
          className="bg-white/90 dark:bg-slate-800/90 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>

      {/* Image */}
      <div className="aspect-square bg-slate-50 dark:bg-slate-800 overflow-hidden">
        {product.image_public_url ? (
          <img
            src={product.image_public_url}
            alt={product.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <Badge variant="secondary" className="text-xs">
          {product.category}
        </Badge>
        <h3 className="font-medium text-sm line-clamp-2 text-[hsl(var(--tl-text-primary))]">
          {product.name}
        </h3>
        
        {/* Quick Add Button */}
        <Button
          size="sm"
          variant="outline"
          className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            handleQuickAdd(product);
          }}
        >
          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
          Quick Add
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="w-[200px] h-[280px] flex-shrink-0 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Frequently Ordered */}
      {showFrequentlyOrdered && frequentlyOrdered.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-[hsl(var(--tl-text-primary))]">
                Frequently Ordered
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/portal/catalog')}
              className="text-primary"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {frequentlyOrdered.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Personalized Recommendations */}
      {showPersonalized && personalizedRecs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-[hsl(var(--tl-text-primary))]">
                {currentProductId ? 'You May Also Like' : 'Recommended for You'}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/portal/catalog')}
              className="text-primary"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {personalizedRecs.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
