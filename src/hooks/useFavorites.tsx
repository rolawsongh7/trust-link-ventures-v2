import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useToast } from '@/hooks/use-toast';

interface Favorite {
  id: string;
  product_id: string;
  customer_id: string;
  created_at: string;
}

interface FavoriteProduct {
  id: string;
  name: string;
  description?: string;
  category: string;
  supplier: string;
  image_public_url?: string;
  slug: string;
}

interface UseFavoritesReturn {
  favorites: Favorite[];
  favoriteProducts: FavoriteProduct[];
  favoriteProductIds: Set<string>;
  loading: boolean;
  addFavorite: (productId: string) => Promise<boolean>;
  removeFavorite: (productId: string) => Promise<boolean>;
  toggleFavorite: (productId: string) => Promise<boolean>;
  isFavorite: (productId: string) => boolean;
  refreshFavorites: () => Promise<void>;
}

export const useFavorites = (): UseFavoritesReturn => {
  const { profile } = useCustomerAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Get customer_id from customer_users mapping
  useEffect(() => {
    const getCustomerId = async () => {
      if (!profile?.id) {
        setCustomerId(null);
        return;
      }

      try {
        const { data: customerMapping } = await supabase
          .from('customer_users')
          .select('customer_id')
          .eq('user_id', profile.id)
          .single();

        setCustomerId(customerMapping?.customer_id || profile.id);
      } catch (error) {
        console.error('Error getting customer_id:', error);
        setCustomerId(profile.id);
      }
    };

    getCustomerId();
  }, [profile?.id]);

  // Fetch favorites when customer_id changes
  const fetchFavorites = useCallback(async () => {
    if (!customerId) {
      setFavorites([]);
      setFavoriteProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch favorites with product data
      const { data: favoritesData, error: favError } = await supabase
        .from('customer_favorites')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (favError) {
        console.error('Error fetching favorites:', favError);
        throw favError;
      }

      setFavorites(favoritesData || []);

      // If we have favorites, fetch the product details
      if (favoritesData && favoritesData.length > 0) {
        const productIds = favoritesData.map(f => f.product_id);
        
        const { data: productsData, error: prodError } = await supabase
          .from('supplier_products')
          .select('id, name, description, category, supplier, image_public_url, slug')
          .in('id', productIds)
          .eq('is_active', true);

        if (prodError) {
          console.error('Error fetching favorite products:', prodError);
        } else {
          setFavoriteProducts(productsData || []);
        }
      } else {
        setFavoriteProducts([]);
      }
    } catch (error) {
      console.error('Error in fetchFavorites:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Memoized Set of favorite product IDs for O(1) lookups
  const favoriteProductIds = useMemo(() => {
    return new Set(favorites.map(f => f.product_id));
  }, [favorites]);

  // Check if a product is favorited
  const isFavorite = useCallback((productId: string): boolean => {
    return favoriteProductIds.has(productId);
  }, [favoriteProductIds]);

  // Add a product to favorites
  const addFavorite = useCallback(async (productId: string): Promise<boolean> => {
    if (!customerId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please sign in to add favorites.",
      });
      return false;
    }

    // Optimistic update
    const tempFavorite: Favorite = {
      id: `temp-${productId}`,
      product_id: productId,
      customer_id: customerId,
      created_at: new Date().toISOString(),
    };
    setFavorites(prev => [tempFavorite, ...prev]);

    try {
      const { data, error } = await supabase
        .from('customer_favorites')
        .insert({
          customer_id: customerId,
          product_id: productId,
        })
        .select()
        .single();

      if (error) {
        // Rollback optimistic update
        setFavorites(prev => prev.filter(f => f.id !== tempFavorite.id));
        
        if (error.code === '23505') {
          // Already favorited, just ignore
          return true;
        }
        
        console.error('Error adding favorite:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to add to favorites.",
        });
        return false;
      }

      // Replace temp with real data
      setFavorites(prev => prev.map(f => 
        f.id === tempFavorite.id ? data : f
      ));

      toast({
        title: "Added to favorites",
        description: "Product saved to your favorites.",
      });

      // Refresh to get product details
      fetchFavorites();
      return true;
    } catch (error) {
      // Rollback optimistic update
      setFavorites(prev => prev.filter(f => f.id !== tempFavorite.id));
      console.error('Error adding favorite:', error);
      return false;
    }
  }, [customerId, toast, fetchFavorites]);

  // Remove a product from favorites
  const removeFavorite = useCallback(async (productId: string): Promise<boolean> => {
    if (!customerId) return false;

    // Find the favorite to remove
    const favoriteToRemove = favorites.find(f => f.product_id === productId);
    if (!favoriteToRemove) return false;

    // Optimistic update
    setFavorites(prev => prev.filter(f => f.product_id !== productId));
    setFavoriteProducts(prev => prev.filter(p => p.id !== productId));

    try {
      const { error } = await supabase
        .from('customer_favorites')
        .delete()
        .eq('customer_id', customerId)
        .eq('product_id', productId);

      if (error) {
        // Rollback optimistic update
        setFavorites(prev => [...prev, favoriteToRemove]);
        console.error('Error removing favorite:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to remove from favorites.",
        });
        return false;
      }

      toast({
        title: "Removed from favorites",
        description: "Product removed from your favorites.",
      });
      return true;
    } catch (error) {
      // Rollback optimistic update
      setFavorites(prev => [...prev, favoriteToRemove]);
      console.error('Error removing favorite:', error);
      return false;
    }
  }, [customerId, favorites, toast]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (productId: string): Promise<boolean> => {
    if (isFavorite(productId)) {
      return removeFavorite(productId);
    } else {
      return addFavorite(productId);
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  return {
    favorites,
    favoriteProducts,
    favoriteProductIds,
    loading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    refreshFavorites: fetchFavorites,
  };
};
