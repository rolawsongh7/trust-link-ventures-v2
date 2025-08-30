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
      // Simulate product data since supplier_products table structure isn't available
      const mockProducts = [
        {
          id: '1',
          name: 'Premium Beef Cuts',
          description: 'High-quality beef cuts from certified suppliers',
          category: 'Meat',
          supplier: 'Premium Meats Ltd',
          brand: 'Prime Cut',
          image_public_url: '/products/beef-strips.png',
          slug: 'premium-beef-cuts'
        },
        {
          id: '2',
          name: 'Fresh Salmon Fillets',
          description: 'Wild-caught salmon fillets, fresh daily',
          category: 'Seafood',
          supplier: 'Ocean Fresh',
          brand: 'Wild Catch',
          image_public_url: '/products/marsea-sea-trout.png',
          slug: 'fresh-salmon-fillets'
        }
      ];

      const products = mockProducts;

      setProducts(products);
      
      // Extract unique categories and suppliers
      const uniqueCategories = [...new Set(products.map(p => p.category))];
      const uniqueSuppliers = [...new Set(products.map(p => p.supplier))];
      
      setCategories(uniqueCategories);
      setSuppliers(uniqueSuppliers);
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      <Badge variant="outline">{product.supplier}</Badge>
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
                {product.brand && (
                  <p className="text-sm font-medium mb-4">
                    Brand: <span className="text-primary">{product.brand}</span>
                  </p>
                )}
                
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
    </div>
  );
};