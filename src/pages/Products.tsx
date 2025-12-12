import React, { useState, useEffect } from 'react';
import { ShoppingCart, Fish, Beef, Package, Globe, Send, X, Filter } from 'lucide-react';
import SEO from '@/components/SEO';
import { PAGE_SEO, SEO_CONFIG } from '@/config/seo.config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { addJabSeafoodProducts } from '@/utils/addJabSeafoodProducts';
import { ShoppingCart as CartComponent } from '@/components/products/ShoppingCart';
import { AddToCartButton } from '@/components/products/AddToCartButton';
import { MultiItemQuoteRequest } from '@/components/products/MultiItemQuoteRequest';
import { FloatingCart } from '@/components/products/FloatingCart';
import { CartModal } from '@/components/products/CartModal';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { categorySlides } from '@/data/categorySlides';
import ProductCard from '@/components/products/ProductCard';

// SEAPRO SAS Product Images - using public folder paths
import seafoodHeroImg from '@/assets/seafood-hero.jpg';


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

const Products = () => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showMultiItemQuote, setShowMultiItemQuote] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(0);
  const [activeFilter, setActiveFilter] = useState('All Products');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useShoppingCart();
  const [formData, setFormData] = useState({
    productName: '',
    buyerName: '',
    email: '',
    country: '',
    quantity: '',
    timeline: '',
    notes: ''
  });
  const [quoteItems, setQuoteItems] = useState<Array<{
    productName: string;
    quantity: string;
    notes: string;
  }>>([]);
  const { toast } = useToast();

  // Filter categories
  const filterCategories = [
    { name: 'All Products', icon: Package },
    { name: 'Fish', icon: Fish },
    { name: 'Meat', icon: Beef },
    { name: 'Beef', icon: Beef },
    { name: 'Pork', icon: Package },
    { name: 'Seafood', icon: Fish },
    { name: 'Other Meat', icon: Beef }
  ];

  // Import JAB Brothers seafood on component mount
  useEffect(() => {
    console.log('🚀 Products useEffect triggered');
    
    // Check if JAB Brothers seafood products exist
    const checkAndImportJabProducts = async () => {
      try {
        console.log('🔍 Checking for existing JAB Brothers products...');
        const { data: existingJabProducts, error: jabError } = await supabase
          .from('supplier_products')
          .select('id')
          .eq('supplier', 'JAB Brothers')
          .limit(1);

        console.log('🔍 JAB check result:', { existingJabProducts, jabError });

        if (jabError) {
          console.error('❌ Error checking JAB products:', jabError);
          return;
        }

        if (!existingJabProducts || existingJabProducts.length === 0) {
          console.log('No JAB Brothers products found, importing...');
          
          const result = await addJabSeafoodProducts();
          console.log('JAB Brothers products imported successfully:', result);
          
          // Refresh products after import
          setTimeout(() => fetchProducts(), 1000);
        } else {
          console.log('JAB Brothers products already exist:', existingJabProducts.length);
        }
      } catch (error) {
        console.error('Error checking/importing JAB products:', error);
      }
    };

    // Don't wait for JAB check to complete
    fetchProducts().catch(error => {
      console.error('❌ Failed to fetch products:', error);
    });
    
    checkAndImportJabProducts().catch(error => {
      console.error('❌ Failed to check/import JAB products:', error);
    });
  }, []);

  const fetchProducts = async () => {
    console.log('🔄 Starting to fetch products...');
    try {
      console.log('🔍 Making Supabase query...');
      const { data: products, error } = await supabase
        .from('supplier_products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      console.log('📊 Products fetch result:', { products: products?.length, error });
      console.log('🔍 Raw products data:', products);

      if (error) {
        console.error('❌ Error fetching products:', error);
        throw error;
      }

      if (products) {
        console.log(`✅ Fetched ${products.length} products from database`);
        
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
              console.log(`🗑️ Filtering out packaging product: ${product.name}`);
              return false;
            }
          }
          return true;
        });

        console.log(`✅ After filtering: ${filteredProducts.length} products remaining`);
        setProducts(filteredProducts);
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load products. Please try again.",
      });
    } finally {
      console.log('🏁 Fetch products completed, setting loading to false');
      setLoading(false);
    }
  };

  // Filter products based on active filter
  const filteredProducts = products.filter(product => {
    if (activeFilter === 'All Products') return true;
    if (activeFilter === 'Fish' || activeFilter === 'Seafood') return product.category === 'Seafood';
    if (activeFilter === 'Meat' || activeFilter === 'Other Meat') return product.category === 'Meat' || product.category === 'Meat & Poultry';
    if (activeFilter === 'Beef') return (product.category === 'Meat' || product.category === 'Meat & Poultry') && (product.name.toLowerCase().includes('beef') || product.name.toLowerCase().includes('entrecôte') || product.name.toLowerCase().includes('flank') || product.name.toLowerCase().includes('hamburger'));
    if (activeFilter === 'Pork') return (product.category === 'Meat' || product.category === 'Meat & Poultry') && product.name.toLowerCase().includes('pork');
    return true;
  });

  const handleQuoteRequest = (product: Product) => {
    setSelectedProduct(product.id);
    setFormData(prev => ({ ...prev, productName: product.name }));
    
    // Initialize with the selected product if no items exist
    if (quoteItems.length === 0) {
      setQuoteItems([{
        productName: product.name,
        quantity: '',
        notes: ''
      }]);
    }
    
    setShowQuoteForm(true);
  };

  const addAnotherProduct = () => {
    setQuoteItems(prev => [...prev, {
      productName: '',
      quantity: '',
      notes: ''
    }]);
  };

  const removeQuoteItem = (index: number) => {
    setQuoteItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuoteItem = (index: number, field: string, value: string) => {
    setQuoteItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.buyerName || !formData.email) {
      toast({
        title: "Error",
        description: "Please fill in all required customer fields",
        variant: "destructive",
      });
      return;
    }

    // Validate at least one product with quantity
    const validItems = quoteItems.filter(item => item.productName && item.quantity);
    if (validItems.length === 0) {
      toast({
        title: "Error", 
        description: "Please add at least one product with quantity",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create leads for each product in the quote request
      const productNames = validItems.map(item => item.productName).join(', ');
      
      // Check if customer already exists to determine if this is a repeat customer
      let customerId = null;
      let isExistingCustomer = false;
      
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        isExistingCustomer = true;
      }

      // Create the quote request record
      const quoteRequestData = {
        request_type: isExistingCustomer ? 'customer' : 'lead',
        title: `Multi-Product Quote Request - ${productNames}`,
        message: `Quote request for ${validItems.length} products:\n${validItems.map(item => `- ${item.productName}: ${item.quantity}kg${item.notes ? ` (${item.notes})` : ''}`).join('\n')}\nTimeline: ${formData.timeline || 'Not specified'}\nGeneral Notes: ${formData.notes || 'None'}`,
        urgency: 'medium',
        status: 'pending',
        customer_id: customerId,
        // Lead information for non-existing customers
        lead_company_name: !isExistingCustomer ? formData.buyerName : null,
        lead_contact_name: !isExistingCustomer ? formData.buyerName : null,
        lead_email: !isExistingCustomer ? formData.email : null,
        lead_country: !isExistingCustomer ? formData.country : null,
        lead_industry: !isExistingCustomer ? 'Food & Beverage' : null,
      };

      const { data: quoteRequest, error: quoteError } = await supabase
        .from('quote_requests')
        .insert([quoteRequestData])
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create quote request items
      const itemsData = validItems.map(item => ({
        quote_request_id: quoteRequest.id,
        product_name: item.productName,
        quantity: parseFloat(item.quantity),
        unit: 'kg',
        specifications: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('quote_request_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      // Create an activity record only for existing customers
      if (isExistingCustomer && customerId) {
        await supabase
          .from('activities')
          .insert([{
            customer_id: customerId,
            activity_type: 'quote_request',
            subject: `Multi-product quote request - ${productNames}`,
            description: `Quote request from ${formData.buyerName} (${formData.email}) for multiple products.\n\nProducts:\n${validItems.map(item => `- ${item.productName}: ${item.quantity}kg${item.notes ? ` (${item.notes})` : ''}`).join('\n')}\n\nTimeline: ${formData.timeline || 'Not specified'}\nCountry: ${formData.country || 'Not specified'}\nGeneral Notes: ${formData.notes || 'None'}`,
            status: 'completed'
          }]);
      }

      toast({
        title: "Success",
        description: "We've received your quote request. We'll get back to you within 24 hours.",
      });
      
      // Reset form and close dialog
      setFormData({
        productName: '',
        buyerName: '',
        email: '',
        country: '',
        quantity: '',
        timeline: '',
        notes: ''
      });
      setQuoteItems([]);
      setShowQuoteForm(false);

    } catch (error) {
      console.error('Error submitting quote request:', error);
      toast({
        title: "Error",
        description: "There was an error submitting your quote request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Seafood': return <Fish className="h-5 w-5 text-primary" />;
      case 'Meat Products': return <Beef className="h-5 w-5 text-primary" />;
      case 'Poultry': return <Package className="h-5 w-5 text-primary" />;
      default: return <Package className="h-5 w-5 text-primary" />;
    }
  };

  // Auto-transition for category slides
  useEffect(() => {
    const categoryTimer = setInterval(() => {
      setCurrentCategory((prev) => (prev + 1) % categorySlides.length);
    }, 4000);
    return () => clearInterval(categoryTimer);
  }, [categorySlides.length]);


  return (
    <div className="min-h-screen">
      <SEO 
        title={PAGE_SEO.products.title}
        description={PAGE_SEO.products.description}
        keywords={PAGE_SEO.products.keywords}
        canonical="https://trustlinkcompany.com/products"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Premium Frozen Food Products Catalog",
          "description": PAGE_SEO.products.description,
          "mainEntity": {
            "@type": "ItemList",
            "name": "Trust Link Ventures Product Catalog",
            "numberOfItems": products.length,
            "itemListElement": products.slice(0, 10).map((product, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "Product",
                "name": product.name,
                "description": product.description,
                "category": product.category,
                "brand": {
                  "@type": "Brand",
                  "name": product.brand || product.supplier
                }
              }
            }))
          }
        }}
      />
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.5)), url(${seafoodHeroImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <span className="bg-primary/20 text-primary-foreground px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
              Premium Export Quality
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-poppins font-bold text-white mb-4 md:mb-6 px-4 sm:px-0">
            Premium <span className="text-primary">Seafood</span> Collections
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-4xl mx-auto leading-relaxed mb-8 md:mb-12 px-4 sm:px-0">
            Explore our premium selection of export-quality seafood products sourced from credible global suppliers. Available for wholesale distribution with custom packaging options.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto px-4 sm:px-0">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 md:p-6 text-center touch-manipulation">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Globe className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <h3 className="text-base md:text-lg font-bold text-white mb-2">Globally Certified</h3>
              <p className="text-white/80 text-sm">International quality standards and certifications</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 md:p-6 text-center touch-manipulation">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Package className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <h3 className="text-base md:text-lg font-bold text-white mb-2">Flash-Frozen for Freshness</h3>
              <p className="text-white/80 text-sm">Advanced preservation techniques for peak quality</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 md:p-6 text-center touch-manipulation sm:col-span-2 lg:col-span-1">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <h3 className="text-base md:text-lg font-bold text-white mb-2">Multi-Item Quotes</h3>
              <p className="text-white/80 text-sm">Add multiple products to cart and request bulk quotes</p>
            </div>
          </div>
          
          {/* Shopping Cart in Hero */}
          <div className="mt-6 md:mt-8 flex justify-center px-4 sm:px-0">
            <CartComponent onRequestQuote={() => setShowMultiItemQuote(true)} />
          </div>
        </div>
      </section>

      {/* Small white space after hero */}
      <div className="py-8 bg-background"></div>


      {/* Category Transition Section */}
      <section className="relative h-[80vh] overflow-hidden">
        {/* Background Images with Transitions */}
        {categorySlides.map((category, index) => (
          <div 
            key={index}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentCategory 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-105'
            }`}
          >
            <img 
              src={category.image} 
              alt={category.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />
          </div>
        ))}

        {/* Content Overlay */}
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              {/* Category Icon */}
              <div 
                key={`icon-${currentCategory}`}
                className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 text-white rounded-2xl mb-6 animate-scale-in backdrop-blur-sm"
              >
                {React.createElement(categorySlides[currentCategory].icon, { 
                  className: "h-8 w-8" 
                })}
              </div>

              {/* Title */}
              <h2 
                key={`title-${currentCategory}`}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-poppins font-bold text-white mb-4 md:mb-6 animate-fade-in px-4 sm:px-0"
              >
                {categorySlides[currentCategory].title}
              </h2>

              {/* Description */}
              <p 
                key={`desc-${currentCategory}`}
                className="text-base sm:text-lg md:text-xl text-white/90 leading-relaxed mb-6 md:mb-8 animate-fade-in px-4 sm:px-0"
                style={{ animationDelay: '0.2s' }}
              >
                {categorySlides[currentCategory].description}
              </p>

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 px-4 sm:px-0">
                <Button 
                  variant="outline"
                  className="w-full sm:w-auto bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm touch-manipulation"
                  onClick={() => setCurrentCategory((prev) => prev === 0 ? categorySlides.length - 1 : prev - 1)}
                >
                  Previous
                </Button>
                <Button 
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 touch-manipulation"
                  onClick={() => setCurrentCategory((prev) => (prev + 1) % categorySlides.length)}
                >
                  Next Category
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex items-center gap-3">
            {categorySlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentCategory(index)}
                className={`h-3 w-12 rounded-full transition-all duration-300 ${
                  index === currentCategory 
                    ? 'bg-white' 
                    : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Product Catalog Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16 px-4 sm:px-0">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-poppins font-bold mb-4 md:mb-6">
              Browse Our <span className="gradient-text">Premium Products</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover our comprehensive selection of premium frozen seafood, meats, and specialty products sourced from trusted suppliers worldwide.
            </p>
          </div>

          {/* Product Filters */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-12 md:mb-16 px-4 sm:px-0">
            {filterCategories.map((filter) => {
              const IconComponent = filter.icon;
              return (
                <button
                  key={filter.name}
                  onClick={() => setActiveFilter(filter.name)}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-3 rounded-full text-sm md:text-base font-medium transition-all duration-300 touch-manipulation ${
                    activeFilter === filter.name
                      ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:scale-105'
                  }`}
                >
                  <IconComponent className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">{filter.name}</span>
                  <span className="sm:hidden">{filter.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
              {[...Array(9)].map((_, i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="h-48 md:h-64 bg-muted"></div>
                  <CardContent className="p-4 md:p-6">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded mb-4 w-2/3"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="h-8 bg-muted rounded"></div>
                      <div className="h-8 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
              {filteredProducts.map((product, index) => (
                <div
                  key={product.id}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  className="animate-fade-in"
                >
                  <ProductCard
                    product={product}
                    onRequestQuote={handleQuoteRequest}
                  />
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* Enhanced Multi-Item Quote Request Dialog */}
      <Dialog open={showQuoteForm} onOpenChange={setShowQuoteForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-poppins">
              Request Quote {quoteItems.length > 1 ? `- ${quoteItems.length} Items` : `- ${formData.productName}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold text-lg">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buyerName">Buyer Name *</Label>
                  <Input
                    id="buyerName"
                    name="buyerName"
                    value={formData.buyerName}
                    onChange={handleInputChange}
                    required
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    required
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeline">Delivery Timeline</Label>
                  <Input
                    id="timeline"
                    name="timeline"
                    value={formData.timeline}
                    onChange={handleInputChange}
                    placeholder="e.g., Within 30 days"
                    className="bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Products Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Products</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={addAnotherProduct}
                >
                  + Add Another Product
                </Button>
              </div>
              
              {quoteItems.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Product {index + 1}</h4>
                    {quoteItems.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeQuoteItem(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Product Name *</Label>
                      <select
                        value={item.productName}
                        onChange={(e) => updateQuoteItem(index, 'productName', e.target.value)}
                        required
                        className="w-full p-2 border rounded-md bg-background"
                      >
                        <option value="">Select a product...</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.name}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Quantity Needed (kg) *</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuoteItem(index, 'quantity', e.target.value)}
                          placeholder="e.g., 500"
                          required
                          className="bg-background pr-10"
                          min="1"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-muted-foreground text-sm font-medium">kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Product-Specific Notes</Label>
                    <Textarea
                      value={item.notes}
                      onChange={(e) => updateQuoteItem(index, 'notes', e.target.value)}
                      rows={2}
                      className="bg-background"
                      placeholder="Specific requirements, certifications needed for this product..."
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* General Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">General Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="bg-background"
                placeholder="Additional requirements, delivery preferences, etc."
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button type="submit" className="flex-1 btn-hero" disabled={isLoading}>
                <Send className="h-4 w-4 mr-2" />
                {isLoading ? 'Submitting...' : 
                  quoteItems.length > 1 
                    ? `Send Quote Request (${quoteItems.length} items)` 
                    : 'Send Quote Request'
                }
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowQuoteForm(false);
                  setQuoteItems([]);
                }}
                className="px-4"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary to-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-poppins font-bold text-primary-foreground mb-6">
            Need Custom Solutions?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Our team can source, package, and deliver custom products tailored to your market requirements.
          </p>
          <Button 
            className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-4 font-semibold hover:scale-105 transition-smooth"
            onClick={() => setShowQuoteForm(true)}
          >
            Get Custom Quote
          </Button>
        </div>
      </section>

      {/* Floating Cart - Web only, native uses bottom tab */}
      <FloatingCart onRequestQuote={() => setShowCartModal(true)} />

      {/* Cart Modal */}
      <CartModal 
        open={showCartModal} 
        onOpenChange={setShowCartModal} 
      />

      {/* Multi-Item Quote Request Dialog */}
      {showMultiItemQuote && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <MultiItemQuoteRequest
              onSuccess={() => setShowMultiItemQuote(false)}
              onCancel={() => setShowMultiItemQuote(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;