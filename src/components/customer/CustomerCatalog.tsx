import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Filter, Package, Plus, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { useToast } from '@/hooks/use-toast';
import { CartModal } from '@/components/products/CartModal';
import { FloatingCart } from '@/components/products/FloatingCart';


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

interface CartItemData {
  productName: string;
  productDescription?: string;
  quantity: number;
  unit: string;
  specifications?: string;
  preferredGrade?: string;
  imageUrl?: string;
}

export const CustomerCatalog: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const { addItem } = useShoppingCart();
  const { toast } = useToast();

  // Add to cart dialog state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCartModal, setShowCartModal] = useState(false);
  const [cartData, setCartData] = useState<CartItemData>({
    productName: '',
    productDescription: '',
    quantity: 1,
    unit: 'kg',
    specifications: '',
    preferredGrade: '',
    imageUrl: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // Fetch real products from the database
      const { data: products, error } = await supabase
        .from('supplier_products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw error;
      }

      if (products) {
        // Filter out products with packaging/carton images
        const filteredProducts = products.filter(product => {
          // Skip J. Marr products with packaging/carton images
          if (product.supplier === 'J. Marr') {
            const name = product.name.toLowerCase();
            const imageUrl = product.image_public_url?.toLowerCase() || '';
            
            // Enhanced filtering for packaging products - any product name containing these terms
            const packagingKeywords = [
              'carton', 'package', 'box', 'bag', 'frozen', 'seph', 'china', 'norway', 
              'japan', 'chile', 'ireland', 'peru', 'oman', 'namibia', 'irish', 
              'atlantic', 'antarctic', 'oceana', 'kamoyasu', 'daikokuya', 'abecho',
              'exalmar', 'kontiki', 'diamante', 'premier', 'sunshine', 'lech drob',
              'koch foods', 'killybegs', 'marr box', 'oshongo', 'pelican', 
              'fosnavaag', 'global', 'sperre', 'vikomar', 'yamada', 'yelpi',
              'nabejyu', 'olav', 'casings', 'da yang', 'animex'
            ];
            
            // Check if any packaging keyword is found in the product name
            const isPackagingProduct = packagingKeywords.some(keyword => 
              name.includes(keyword)
            );
            
            // Also check image URL for packaging indicators
            const hasPackagingImage = imageUrl.includes('carton') || 
                                    imageUrl.includes('package') || 
                                    imageUrl.includes('box');
            
            if (isPackagingProduct || hasPackagingImage) {
              return false;
            }
          }
          return true;
        });

        setProducts(filteredProducts);
        
        // Extract unique categories and suppliers
        const uniqueCategories = [...new Set(filteredProducts.map(p => p.category))];
        const uniqueSuppliers = [...new Set(filteredProducts.map(p => p.supplier))];
        
        setCategories(uniqueCategories);
        setSuppliers(uniqueSuppliers);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load products. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSupplier = selectedSupplier === 'all' || product.supplier === selectedSupplier;
    
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  const openAddToCartDialog = (product: Product) => {
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Product Catalog
          </h1>
          <p className="text-muted-foreground">
            Browse our extensive range of premium products
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Package className="h-4 w-4 mr-2" />
          {filteredProducts.length} Products
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Supplier filter hidden from customers but kept for backend filtering */}
            <div className="hidden">
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedSupplier('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria or filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-3">
                {product.image_public_url && (
                  <div className="aspect-video rounded-lg overflow-hidden mb-3">
                    <img
                      src={product.image_public_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {product.name}
                    </CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{product.category}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {product.description && (
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {product.description}
                  </p>
                )}
                {/* Brand hidden from customers */}
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => openAddToCartDialog(product)}
                      className="w-full bg-gradient-to-r from-primary to-primary/90"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </DialogTrigger>
                  
                  {selectedProduct?.id === product.id && (
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Add to Cart: {selectedProduct.name}</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                              id="quantity"
                              type="number"
                              min="1"
                              value={cartData.quantity}
                              onChange={(e) => setCartData({ ...cartData, quantity: parseInt(e.target.value) || 1 })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="unit">Unit</Label>
                            <Select value={cartData.unit} onValueChange={(value) => setCartData({ ...cartData, unit: value })}>
                              <SelectTrigger>
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
                          <Label htmlFor="grade">Preferred Grade (Optional)</Label>
                          <Select value={cartData.preferredGrade} onValueChange={(value) => setCartData({ ...cartData, preferredGrade: value })}>
                            <SelectTrigger>
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
                          <Label htmlFor="specifications">Specifications (Optional)</Label>
                          <Textarea
                            id="specifications"
                            placeholder="Any specific requirements, size, packaging, etc."
                            value={cartData.specifications}
                            onChange={(e) => setCartData({ ...cartData, specifications: e.target.value })}
                            rows={3}
                          />
                        </div>
                        
                        <Button onClick={handleAddToCart} className="w-full">
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add to Cart
                        </Button>
                      </div>
                    </DialogContent>
                  )}
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cart Modal */}
      <CartModal 
        open={showCartModal} 
        onOpenChange={setShowCartModal} 
      />

      {/* Floating Cart */}
      <FloatingCart onRequestQuote={() => setShowCartModal(true)} />
    </div>
  );
};