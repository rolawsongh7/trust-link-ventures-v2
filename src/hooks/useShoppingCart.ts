import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CartItem {
  id: string;
  productName: string;
  productDescription?: string;
  quantity: number;
  unit: string;
  specifications?: string;
  preferredGrade?: string;
  imageUrl?: string;
}

interface UseShoppingCartReturn {
  items: CartItem[];
  totalItems: number;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  loading: boolean;
}

export const useShoppingCart = (): UseShoppingCartReturn => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load cart items from database
  const loadCartItems = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const cartItems = data.map(item => ({
        id: item.id,
        productName: item.product_name,
        productDescription: item.product_description,
        quantity: item.quantity,
        unit: item.unit,
        specifications: item.specifications,
        preferredGrade: item.preferred_grade,
        imageUrl: item.image_url,
      }));

      setItems(cartItems);
    } catch (error) {
      console.error('Error loading cart items:', error);
      toast({
        variant: "destructive",
        title: "Cart Load Error",
        description: "Failed to load your cart items. Please refresh the page.",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Load cart items when user changes
  useEffect(() => {
    if (user) {
      loadCartItems();
    } else {
      setItems([]);
    }
  }, [user, loadCartItems]);

  const addItem = useCallback(async (newItem: Omit<CartItem, 'id'>) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to add items to your cart.",
      });
      return;
    }

    try {
      // Check if similar item already exists
      const existingItem = items.find(
        item => 
          item.productName === newItem.productName &&
          item.unit === newItem.unit &&
          item.preferredGrade === newItem.preferredGrade &&
          item.specifications === newItem.specifications
      );

      if (existingItem) {
        // Update existing item quantity
        await updateQuantity(existingItem.id, existingItem.quantity + newItem.quantity);
      } else {
        // Add new item to database
        const { data, error } = await supabase
          .from('cart_items')
          .insert([
            {
              user_id: user.id,
              product_name: newItem.productName,
              product_description: newItem.productDescription,
              quantity: newItem.quantity,
              unit: newItem.unit,
              specifications: newItem.specifications,
              preferred_grade: newItem.preferredGrade,
              image_url: newItem.imageUrl,
            }
          ])
          .select()
          .single();

        if (error) throw error;

        const cartItem: CartItem = {
          id: data.id,
          productName: data.product_name,
          productDescription: data.product_description,
          quantity: data.quantity,
          unit: data.unit,
          specifications: data.specifications,
          preferredGrade: data.preferred_grade,
          imageUrl: data.image_url,
        };

        setItems(prevItems => [...prevItems, cartItem]);
      }

      toast({
        title: "Item Added",
        description: `${newItem.productName} has been added to your cart.`,
      });
    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast({
        variant: "destructive",
        title: "Add Item Error",
        description: "Failed to add item to cart. Please try again.",
      });
    }
  }, [user, items, toast]);

  const removeItem = useCallback(async (itemId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) throw error;

      setItems(prevItems => prevItems.filter(item => item.id !== itemId));
      
      toast({
        title: "Item Removed",
        description: "Item has been removed from your cart.",
      });
    } catch (error) {
      console.error('Error removing item from cart:', error);
      toast({
        variant: "destructive",
        title: "Remove Item Error",
        description: "Failed to remove item from cart. Please try again.",
      });
    }
  }, [user, toast]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity < 1 || !user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) throw error;

      setItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    } catch (error) {
      console.error('Error updating item quantity:', error);
      toast({
        variant: "destructive",
        title: "Update Error",
        description: "Failed to update item quantity. Please try again.",
      });
    }
  }, [user, toast]);

  const clearCart = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setItems([]);
      
      toast({
        title: "Cart Cleared",
        description: "All items have been removed from your cart.",
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        variant: "destructive",
        title: "Clear Cart Error",
        description: "Failed to clear cart. Please try again.",
      });
    }
  }, [user, toast]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    totalItems,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    loading,
  };
};