import React, { useState, useEffect } from 'react';
import { ShoppingCart, Fish, Beef, Package, Globe, Send, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart as CartComponent } from '@/components/products/ShoppingCart';
import { AddToCartButton } from '@/components/products/AddToCartButton';
import { MultiItemQuoteRequest } from '@/components/products/MultiItemQuoteRequest';
import { FloatingCart } from '@/components/products/FloatingCart';
import { productData } from '@/data/products';
import { categorySlides } from '@/data/categorySlides';

// SEAPRO SAS Product Images - using public folder paths
import seafoodHeroImg from '@/assets/seafood-hero.jpg';
import BulkSupplierImport from '@/components/products/BulkSupplierImport';

const Products = () => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showMultiItemQuote, setShowMultiItemQuote] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(0);
  const [activeFilter, setActiveFilter] = useState('All Products');
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

  // J. Marr seafood items (imported from supplier)
  const [jmarrItems, setJmarrItems] = useState<Array<{ id: string; name: string; image: string; source_url: string | null }>>([]);
  const [jmarrLoading, setJmarrLoading] = useState(false);

  const loadJmarrItems = async () => {
    setJmarrLoading(true);
    const { data, error } = await (supabase as any)
      .from('supplier_products')
      .select('id, name, image_public_url, remote_image_url, source_url, category, supplier, is_active')
      .eq('supplier', 'J. Marr')
      .eq('category', 'Seafood')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (!error && data) {
      setJmarrItems(
        data.map((d: any) => ({
          id: d.id,
          name: d.name,
          image: d.image_public_url || d.remote_image_url,
          source_url: d.source_url ?? null,
        }))
      );
    }
    setJmarrLoading(false);
  };

  const importJmarr = async (download = true) => {
    setJmarrLoading(true);
    const { data, error } = await supabase.functions.invoke('import-jmarr-seafood', {
      body: { download },
    });
    if (error) {
      console.error(error);
      toast({ title: 'Import failed', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Import started',
        description: data?.summary?.downloadStarted
          ? 'Images are downloading in the background.'
          : 'Imported items successfully.',
      });
      // Give the DB a moment then refresh the list
      setTimeout(() => {
        loadJmarrItems();
      }, 1000);
    }
    setJmarrLoading(false);
  };
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

  // Filter products based on active filter
  const filteredProducts = productData.filter(product => {
    if (activeFilter === 'All Products') return true;
    if (activeFilter === 'Fish' || activeFilter === 'Seafood') return product.category === 'Seafood';
    if (activeFilter === 'Meat' || activeFilter === 'Other Meat') return product.category === 'Meat Products';
    if (activeFilter === 'Beef') return product.category === 'Meat Products' && (product.name.toLowerCase().includes('beef') || product.name.toLowerCase().includes('entrecôte') || product.name.toLowerCase().includes('flank') || product.name.toLowerCase().includes('hamburger'));
    if (activeFilter === 'Pork') return product.category === 'Meat Products' && product.name.toLowerCase().includes('pork');
    return true;
  });

  const handleQuoteRequest = (product: typeof productData[0]) => {
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

  // Load supplier items (J. Marr Seafood) on mount
  useEffect(() => {
    loadJmarrItems();
  }, []);

  return (
    <div className="min-h-screen">
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
          
          <h1 className="text-5xl lg:text-7xl font-poppins font-bold text-white mb-6">
            Premium <span className="text-primary">Seafood</span> Collections
          </h1>
          
          <p className="text-xl text-white/90 max-w-4xl mx-auto leading-relaxed mb-12">
            Explore our premium selection of export-quality seafood products sourced from SEAPRO SAS trusted suppliers. Available for wholesale distribution with custom packaging options.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Globally Certified</h3>
              <p className="text-white/80 text-sm">International quality standards and certifications</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Flash-Frozen for Freshness</h3>
              <p className="text-white/80 text-sm">Advanced preservation techniques for peak quality</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Multi-Item Quotes</h3>
              <p className="text-white/80 text-sm">Add multiple products to cart and request bulk quotes</p>
            </div>
          </div>
          
          {/* Shopping Cart in Hero */}
          <div className="mt-8 flex justify-center">
            <CartComponent onRequestQuote={() => setShowMultiItemQuote(true)} />
          </div>
        </div>
      </section>

      {/* Small white space after hero */}
      <div className="py-8 bg-background"></div>

      {/* Supplier Imports Admin */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BulkSupplierImport />
        </div>
      </section>

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
                className="text-5xl lg:text-6xl font-poppins font-bold text-white mb-6 animate-fade-in"
              >
                {categorySlides[currentCategory].title}
              </h2>

              {/* Description */}
              <p 
                key={`desc-${currentCategory}`}
                className="text-xl text-white/90 leading-relaxed mb-8 animate-fade-in"
                style={{ animationDelay: '0.2s' }}
              >
                {categorySlides[currentCategory].description}
              </p>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                  onClick={() => setCurrentCategory((prev) => prev === 0 ? categorySlides.length - 1 : prev - 1)}
                >
                  Previous
                </Button>
                <Button 
                  className="bg-primary hover:bg-primary/90"
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
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-poppins font-bold mb-6">
              Browse Our <span className="gradient-text">Premium Products</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover our comprehensive selection of premium frozen seafood, meats, and specialty products sourced from trusted suppliers worldwide.
            </p>
          </div>

          {/* Product Filters */}
          <div className="flex flex-wrap justify-center gap-3 mb-16">
            {filterCategories.map((filter) => {
              const IconComponent = filter.icon;
              return (
                <button
                  key={filter.name}
                  onClick={() => setActiveFilter(filter.name)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                    activeFilter === filter.name
                      ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                      : 'bg-accent hover:bg-accent/80 text-accent-foreground hover:scale-105'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  {filter.name}
                </button>
              );
            })}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product, index) => (
              <Card 
                key={product.id} 
                className="group overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Product Image */}
                <div className="relative h-64 overflow-hidden">
                  {typeof product.image === 'string' && product.image.startsWith('/') ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        console.error(`Failed to load image: ${product.image} for product: ${product.name}`);
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.classList.add('bg-gradient-to-br', 'from-primary/20', 'to-primary/10', 'flex', 'items-center', 'justify-center');
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.innerHTML = `<span class="text-6xl">🐟</span>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <span className="text-6xl">{product.image}</span>
                    </div>
                  )}
                  
                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                      {product.category === 'Seafood' ? 'Farm Fresh' : 'Premium Grade'}
                    </span>
                  </div>
                  
                  {/* Product ID Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="bg-black/50 text-white px-2 py-1 rounded text-xs font-mono">
                      {product.id}
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <CardContent className="p-6">
                  <div className="mb-3">
                    <h3 className="text-xl font-poppins font-bold mb-1">{product.name}</h3>
                    <p className="text-primary text-sm font-medium">{product.category}</p>
                  </div>
                  
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
                    {product.description}
                  </p>

                  {/* Product Details */}
                  <div className="space-y-3 mb-6">
                    <div>
                      <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">Origin</h4>
                      <p className="text-sm">{product.origin}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">Certifications</h4>
                      <div className="flex flex-wrap gap-1">
                        {product.certifications.slice(0, 2).map((cert, idx) => (
                          <span key={idx} className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded">
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    <div className="text-center py-2">
                      <span className="text-muted-foreground text-sm">Contact for Pricing</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        onClick={() => handleQuoteRequest(product)}
                        variant="outline"
                        className="w-full"
                      >
                        Quick Quote
                      </Button>
                      <AddToCartButton
                        productName={product.name}
                        productDescription={product.description}
                        imageUrl={product.image}
                        data-product-name={product.name}
                      />
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground text-center">
                        💡 Add multiple items to cart for bulk quotes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* J. Marr Seafood (Imported) */}
          {(activeFilter === 'All Products' || activeFilter === 'Fish' || activeFilter === 'Seafood') && (
            <div className="mt-16">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-poppins font-bold">J. Marr Seafood</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => importJmarr(true)} disabled={jmarrLoading}>
                    {jmarrLoading ? 'Importing…' : 'Re-import from source'}
                  </Button>
                </div>
              </div>

              {jmarrLoading ? (
                <p className="text-muted-foreground">Loading supplier items…</p>
              ) : jmarrItems.length === 0 ? (
                <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                  No J. Marr seafood items yet. Click “Re-import from source” to fetch them.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {jmarrItems.map((item) => (
                    <Card key={item.id} className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                      <div className="relative h-64 overflow-hidden bg-accent">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('bg-gradient-to-br','from-primary/20','to-primary/10','flex','items-center','justify-center');
                            if (e.currentTarget.parentElement) {
                              (e.currentTarget.parentElement as HTMLElement).innerHTML = `<span class='text-6xl'>🐟</span>`;
                            }
                          }}
                          loading="lazy"
                        />
                        <div className="absolute top-4 left-4">
                          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">Supplier</span>
                        </div>
                      </div>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-poppins font-bold mb-2">{item.name}</h3>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, productName: item.name }));
                              setQuoteItems([{ productName: item.name, quantity: '', notes: '' }]);
                              setShowQuoteForm(true);
                            }}
                          >
                            Request Quote
                          </Button>
                          <AddToCartButton
                            productName={item.name}
                            productDescription={''}
                            imageUrl={item.image}
                            data-product-name={item.name}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
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
                        {productData.map((product) => (
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

      {/* Floating Cart */}
      <FloatingCart onRequestQuote={() => setShowMultiItemQuote(true)} />

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