import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Filter, Package, Plus, ShoppingCart, Grid3X3, Building2, CheckCircle } from 'lucide-react';
import { PortalPageHeader } from './PortalPageHeader';
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
    console.log('[CustomerCatalog] Starting product fetch...');
    try {
      // Fetch real products from the database
      console.log('[CustomerCatalog] Querying Supabase for products...');
      const { data: products, error } = await supabase
        .from('supplier_products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      console.log('[CustomerCatalog] Supabase response:', { 
        productCount: products?.length ?? 0, 
        error: error?.message ?? null 
      });

      if (error) {
        console.error('[CustomerCatalog] Supabase error:', error);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
      {/* Gradient Header Section */}
      <Card className="overflow-hidden">
        <PortalPageHeader
          title="Product Catalog"
          subtitle="Browse our premium frozen & fresh products"
          totalCount={filteredProducts.length}
          totalIcon={Package}
          patternId="catalog-grid"
        />
      </Card>

      {/* Filters Card */}
      <Card className="bg-tl-surface border-tl-border border-l-4 border-l-slate-400 shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-tl-muted" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-tl-border focus:ring-2 focus:ring-tl-accent/40 focus:border-tl-accent"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="border-tl-border focus:ring-2 focus:ring-tl-accent/40">
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
              className="border-tl-border hover:bg-tl-border/20"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card className="text-center py-12 bg-tl-surface border-tl-border shadow-sm">
          <CardContent>
            <Package className="h-16 w-16 text-tl-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-tl-text mb-2">No products found</h3>
            <p className="text-tl-muted">
              Try adjusting your search criteria or filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredProducts.map((product) => (
          <article 
            key={product.id} 
            className="bg-tl-surface border border-tl-border border-l-4 border-l-maritime-400 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
          >
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
                <h3 className="text-tl-text font-semibold text-lg mb-2 line-clamp-2">
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
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => openAddToCartDialog(product)}
                      className="w-full py-2 rounded-lg shadow-md bg-tl-gradient hover:opacity-95 font-medium text-white min-h-[44px]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </DialogTrigger>
                  
                  {selectedProduct?.id === product.id && (
                    <DialogContent className="max-w-md bg-tl-surface/95 backdrop-blur-md border-tl-border shadow-lg">
                      <DialogHeader>
                        <DialogTitle className="text-tl-text text-lg">
                          Add to Cart: {selectedProduct.name}
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
                  )}
                </Dialog>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Cart Modal */}
      <CartModal 
        open={showCartModal}
        onOpenChange={setShowCartModal} 
      />

      {/* Floating Cart - Web only, native uses bottom tab */}
      <FloatingCart onRequestQuote={() => setShowCartModal(true)} />
    </div>
  );
};