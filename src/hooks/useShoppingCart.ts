import { useState, useCallback } from 'react';

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
}

export const useShoppingCart = (): UseShoppingCartReturn => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((newItem: Omit<CartItem, 'id'>) => {
    const id = `${newItem.productName}-${Date.now()}`;
    const cartItem: CartItem = { ...newItem, id };
    
    setItems(prevItems => {
      // Check if similar item already exists
      const existingIndex = prevItems.findIndex(
        item => 
          item.productName === newItem.productName &&
          item.unit === newItem.unit &&
          item.preferredGrade === newItem.preferredGrade &&
          item.specifications === newItem.specifications
      );

      if (existingIndex >= 0) {
        // Update existing item quantity
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + newItem.quantity
        };
        return updated;
      }

      // Add new item
      return [...prevItems, cartItem];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity < 1) return;
    
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    totalItems,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
};