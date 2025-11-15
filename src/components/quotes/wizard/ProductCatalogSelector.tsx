import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, ShoppingCart, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface Product {
  id: string;
  name: string;
  category: string;
  supplier: string;
  brand?: string;
  description?: string;
  image_public_url?: string;
}

interface SelectedItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  description?: string;
}

interface ProductCatalogSelectorProps {
  selectedItems: SelectedItem[];
  onItemsChange: (items: SelectedItem[]) => void;
  onAddCustomItem: () => void;
  currency: string;
}

export const ProductCatalogSelector: React.FC<ProductCatalogSelectorProps> = ({
  selectedItems,
  onItemsChange,
  onAddCustomItem,
  currency
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setProducts(data || []);
      
      // Extract unique categories and suppliers
      const uniqueCategories = [...new Set(data?.map(p => p.category) || [])];
      const uniqueSuppliers = [...new Set(data?.map(p => p.supplier) || [])];
      setCategories(uniqueCategories);
      setSuppliers(uniqueSuppliers);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesSupplier = supplierFilter === 'all' || product.supplier === supplierFilter;
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  const isSelected = (productId: string) => {
    return selectedItems.some(item => item.productId === productId);
  };

  const handleToggleProduct = (product: Product) => {
    if (isSelected(product.id)) {
      onItemsChange(selectedItems.filter(item => item.productId !== product.id));
    } else {
      onItemsChange([
        ...selectedItems,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: 0,
          unit: 'kg',
          description: product.description
        }
      ]);
    }
  };

  const handleUpdateItem = (productId: string, field: string, value: any) => {
    onItemsChange(
      selectedItems.map(item =>
        item.productId === productId
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const selectedCount = selectedItems.length;

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers.map(sup => (
              <SelectItem key={sup} value={sup}>{sup}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product List */}
      <div className="border rounded-lg max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading products...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>No products found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredProducts.map(product => {
              const selected = isSelected(product.id);
              const item = selectedItems.find(i => i.productId === product.id);

              return (
                <div
                  key={product.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    selected ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => handleToggleProduct(product)}
                      className="mt-1"
                    />
                    
                    {product.image_public_url && (
                      <img
                        src={product.image_public_url}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{product.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {product.category}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {product.supplier}
                        </span>
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {product.description}
                        </p>
                      )}

                      {selected && item && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItem(product.id, 'quantity', Number(e.target.value))
                            }
                            min="1"
                          />
                          <Input
                            type="text"
                            placeholder="Unit"
                            value={item.unit}
                            onChange={(e) =>
                              handleUpdateItem(product.id, 'unit', e.target.value)
                            }
                          />
                          <Input
                            type="number"
                            placeholder={`Price (${currency})`}
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleUpdateItem(product.id, 'unitPrice', Number(e.target.value))
                            }
                            min="0"
                            step="0.01"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          <span className="font-medium">{selectedCount} item(s) selected</span>
        </div>
        <Button variant="outline" onClick={onAddCustomItem}>
          <Plus className="mr-2 h-4 w-4" />
          Add Custom Item
        </Button>
      </div>
    </div>
  );
};
