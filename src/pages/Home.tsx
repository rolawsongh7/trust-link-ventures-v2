import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe, TrendingUp, Users, Zap, Package, Leaf, Star, Ship, Truck, Target, Search, Shield, Factory, MapPin, CheckCircle, Clock, Thermometer } from 'lucide-react';
import { useCounterAnimation } from '@/hooks/useCounterAnimation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import heroImage from '@/assets/fleet-ships-hero.jpg';
import processStep1 from '@/assets/process-step-1.jpg';
import processStep2 from '@/assets/process-step-2.jpg';
import processStep3 from '@/assets/process-step-3.jpg';
import processStep4 from '@/assets/process-step-4.jpg';
import processStep5 from '@/assets/process-step-5.jpg';
import processStep6 from '@/assets/process-step-6.jpg';
import processStep7 from '@/assets/process-step-7.jpg';
import coldChainBg from '@/assets/quality-assurance/cold-chain-bg.jpg';
import marketPricingBg from '@/assets/quality-assurance/market-pricing-bg.jpg';
import foodSafetyBg from '@/assets/quality-assurance/food-safety-bg.jpg';
import certifiedSuppliersBg from '@/assets/quality-assurance/certified-suppliers-bg.jpg';

// Stats Card Component with Counter Animation
const StatsCard = ({ stats }: { stats: Array<{ end: number; suffix: string; label: string; icon: any }> }) => {
  return (
    <div className="animate-fade-in-right">
      <Card className="card-elevated p-8 bg-gradient-to-br from-background to-accent/30 border-0 shadow-2xl">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 gap-6">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              const { count, ref } = useCounterAnimation({ 
                end: stat.end, 
                suffix: stat.suffix, 
                duration: 2500 + (index * 200) 
              });
              
              return (
                <div key={index} ref={ref} className="text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl shadow-lg">
                      <IconComponent className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <div className="text-4xl lg:text-5xl font-poppins font-black gradient-text">
                    {count}
                  </div>
                  <div className="text-sm text-muted-foreground font-semibold uppercase tracking-wide">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Home = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroStories = [
    {
      title: (
        <>
          The World's Most <span className="gradient-text">Trusted</span>{' '}
          <span className="gradient-text">Cold Chain</span> Partner
        </>
      ),
      subtitle: "Delivering excellence across the globe with unmatched reliability, advanced technology, and zero-compromise quality standards.",
      icon: Globe,
      accent: "Global cold chain excellence"
    },
    {
      title: (
        <>
          <span className="gradient-text">99.8%</span> On-Time Delivery{' '}
          <span className="gradient-text">Across</span> Multiple Countries
        </>
      ),
      subtitle: "Our precision logistics network ensures your goods arrive exactly when promised, every single time, anywhere in the world.",
      icon: Target,
      accent: "Precision delivery guaranteed"
    },
    {
      title: (
        <>
          <span className="gradient-text">Zero</span> Temperature Breaches{' '}
          in <span className="gradient-text">18 Months</span>
        </>
      ),
      subtitle: "Advanced IoT monitoring and redundant cold chain systems maintain perfect temperature control from source to destination.",
      icon: Thermometer,
      accent: "Perfect temperature control"
    }
  ];

  const stats = [
    { end: 99.8, suffix: '%', label: 'On-Time Delivery', icon: Target },
    { end: 18, suffix: '', label: 'Months Zero Breaches', icon: Thermometer },
    { end: 24, suffix: '/7', label: 'Real-Time Tracking', icon: Clock },
  ];

  const [currentProcessStep, setCurrentProcessStep] = useState(0);

  const qualityAssurance = [
    {
      icon: Thermometer,
      title: 'Cold Chain Logistics',
      description: 'Unbroken temperature control at -18°C from source to destination',
      backgroundImage: coldChainBg,
      color: 'blue',
      overlay: 'from-blue-900/80 to-blue-600/60'
    },
    {
      icon: TrendingUp,
      title: 'Market Pricing',
      description: 'Fresh market pricing, not frozen premiums for maximum value',
      backgroundImage: marketPricingBg,
      color: 'green',
      overlay: 'from-green-900/80 to-green-600/60'
    },
    {
      icon: Shield,
      title: 'Food Safety Compliance',
      description: 'Full compliance with international food safety and export standards',
      backgroundImage: foodSafetyBg,
      color: 'purple',
      overlay: 'from-purple-900/80 to-purple-600/60'
    },
    {
      icon: Users,
      title: 'Certified Suppliers',
      description: 'Partnerships with verified and certified premium suppliers worldwide',
      backgroundImage: certifiedSuppliersBg,
      color: 'orange',
      overlay: 'from-orange-900/80 to-orange-600/60'
    },
  ];

  const processSteps = [
    {
      step: '01',
      icon: Package,
      title: 'Place Your Order',
      description: 'Submit your request online or through our sales team. We confirm every detail to start the process quickly and accurately.',
      image: processStep1,
      transition: 'slide-in-left'
    },
    {
      step: '02',
      icon: Search,
      title: 'Real-Time Sourcing',
      description: 'We source directly from trusted suppliers to secure the best market prices — fast, transparent, and efficient.',
      image: processStep2,
      transition: 'scale-in'
    },
    {
      step: '03',
      icon: Shield,
      title: 'Quality Verification',
      description: 'Each product undergoes rigorous inspection and compliance checks before it\'s packed — your standards are ours.',
      image: processStep3,
      transition: 'fade-in'
    },
    {
      step: '04',
      icon: Package,
      title: 'Professional Packaging',
      description: 'Your order is securely packed in temperature-controlled, export-ready containers to maintain product integrity.',
      image: processStep4,
      transition: 'slide-in-right'
    },
    {
      step: '05',
      icon: Ship,
      title: 'Global Shipping',
      description: 'We handle all logistics and documentation — your order travels swiftly and securely to Ghana.',
      image: processStep5,
      transition: 'slide-in-left'
    },
    {
      step: '06',
      icon: Factory,
      title: 'Arrival at Ghana Cold Store',
      description: 'Your shipment arrives at our certified cold store facility in Ghana — monitored, secure, and fully temperature-controlled.',
      image: processStep6,
      transition: 'fade-in'
    },
    {
      step: '07',
      icon: Truck,
      title: 'Final Mile Delivery',
      description: 'From our cold store to your warehouse or customer — on time, every time.',
      image: processStep7,
      transition: 'scale-in'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroStories.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroStories.length]);

  useEffect(() => {
    const processTimer = setInterval(() => {
      setCurrentProcessStep((prev) => (prev + 1) % processSteps.length);
    }, 4000);
    return () => clearInterval(processTimer);
  }, [processSteps.length]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent z-10" />
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in-left">
              {/* Story Indicator */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  {heroStories.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1 w-8 rounded-full transition-all duration-500 ${
                        index === currentSlide ? 'bg-primary' : 'bg-primary/30'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="p-1 bg-primary/10 rounded-full">
                    {React.createElement(heroStories[currentSlide].icon, { className: "h-4 w-4 text-primary" })}
                  </div>
                  <span className="font-medium">{heroStories[currentSlide].accent}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h1 
                  key={currentSlide} 
                  className="text-5xl lg:text-7xl font-poppins font-black leading-tight animate-fade-in"
                >
                  {heroStories[currentSlide].title}
                </h1>
                <p 
                  key={`subtitle-${currentSlide}`}
                  className="text-xl text-muted-foreground leading-relaxed max-w-2xl animate-fade-in"
                  style={{ animationDelay: '0.1s' }}
                >
                  {heroStories[currentSlide].subtitle}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild variant="outline" className="btn-outline text-lg px-8 py-4">
                  <Link to="/products">
                    View Products
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Enhanced Stats Card with World-Class Metrics */}
            <div className="animate-fade-in-right">
              <Card className="p-8 bg-white/30 backdrop-blur-sm border border-white/20 shadow-2xl">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-poppins font-bold gradient-text mb-2">
                      World-Class Performance
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Measurable excellence in every metric
                    </p>
                  </div>
                  
                  {/* Horizontal Stats Row */}
                  <div className="flex justify-center items-center space-x-12">
                    {stats.map((stat, index) => {
                      const IconComponent = stat.icon;
                      const { count, ref } = useCounterAnimation({ 
                        end: stat.end, 
                        suffix: stat.suffix, 
                        duration: 2500 + (index * 200) 
                      });
                      
                      return (
                        <div key={index} ref={ref} className="text-center space-y-3">
                          <div className="flex justify-center">
                            <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl shadow-lg">
                              <IconComponent className="h-7 w-7 text-primary" />
                            </div>
                          </div>
                          <div className="text-4xl lg:text-5xl font-poppins font-black gradient-text">
                            {count}
                          </div>
                          <div className="text-sm text-muted-foreground font-semibold uppercase tracking-wide">
                            {stat.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-neutral-50 to-primary-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl lg:text-5xl font-poppins font-bold mb-6">
              Quality <span className="gradient-text">Assurance</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Uncompromising standards that guarantee excellence in every shipment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {qualityAssurance.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div 
                  key={index} 
                  className="relative h-80 rounded-2xl overflow-hidden group cursor-pointer animate-scale-in hover:scale-105 transition-all duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Background Image */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${feature.backgroundImage})` }}
                  />
                  
                  {/* Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-b ${feature.overlay}`} />
                  
                  {/* Content */}
                  <div className="relative z-10 h-full flex flex-col justify-center items-center text-center p-6 text-white">
                    <div className="mb-4 p-3 bg-white/20 rounded-full backdrop-blur-sm">
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-poppins font-bold mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-white/90">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Process Section - NGL Style Carousel */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl lg:text-5xl font-poppins font-bold mb-6">
              <span className="gradient-text">Order to Distribution</span> - Excellence Guaranteed!
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From initial sourcing to final delivery, our systematic approach ensures excellence at every stage of the supply chain.
            </p>
          </div>

          {/* Process Carousel */}
          <div className="relative h-[600px] overflow-hidden rounded-3xl">
            {/* Background Images with Transitions */}
            {processSteps.map((step, index) => (
              <div 
                key={index}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                  index === currentProcessStep 
                    ? 'opacity-100 scale-100' 
                    : 'opacity-0 scale-105'
                }`}
              >
                <img 
                  src={step.image} 
                  alt={step.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />
              </div>
            ))}

            {/* Content Overlay */}
            <div className="relative z-10 h-full flex items-center">
              <div className="max-w-2xl mx-auto px-8 text-center text-white">
                {/* Step Number */}
                <div 
                  key={`step-${currentProcessStep}`}
                  className="inline-flex items-center justify-center w-20 h-20 bg-primary text-primary-foreground rounded-full font-bold text-2xl mb-8 animate-scale-in"
                >
                  {processSteps[currentProcessStep].step}
                </div>

                {/* Title */}
                <h3 
                  key={`title-${currentProcessStep}`}
                  className="text-4xl lg:text-5xl font-poppins font-bold mb-6 animate-fade-in"
                >
                  {processSteps[currentProcessStep].title}
                </h3>

                {/* Description */}
                <p 
                  key={`desc-${currentProcessStep}`}
                  className="text-xl leading-relaxed mb-8 animate-fade-in"
                  style={{ animationDelay: '0.2s' }}
                >
                  {processSteps[currentProcessStep].description}
                </p>

                {/* Icon */}
                <div 
                  key={`icon-${currentProcessStep}`}
                  className="flex justify-center animate-scale-in"
                  style={{ animationDelay: '0.4s' }}
                >
                  <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                    {React.createElement(processSteps[currentProcessStep].icon, { 
                      className: "h-12 w-12 text-white" 
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Indicators */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
              <div className="flex items-center gap-3">
                {processSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentProcessStep(index)}
                    className={`h-3 w-8 rounded-full transition-all duration-300 ${
                      index === currentProcessStep 
                        ? 'bg-white' 
                        : 'bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={() => setCurrentProcessStep((prev) => 
                prev === 0 ? processSteps.length - 1 : prev - 1
              )}
              className="absolute left-8 top-1/2 transform -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all duration-200"
            >
              <ArrowRight className="h-6 w-6 text-white rotate-180" />
            </button>
            
            <button
              onClick={() => setCurrentProcessStep((prev) => 
                (prev + 1) % processSteps.length
              )}
              className="absolute right-8 top-1/2 transform -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all duration-200"
            >
              <ArrowRight className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Process CTA */}
          <div className="text-center mt-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-6 py-3 rounded-full font-medium">
              <CheckCircle className="h-5 w-5" />
              <span>Our Trusted Approach</span>
            </div>
          </div>
        </div>
      </section>

      {/* Product Snapshot Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl lg:text-5xl font-poppins font-bold mb-6">
              Product <span className="gradient-text">Snapshot</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
              Discover our premium selection of fresh and frozen products, sourced globally and delivered with uncompromising quality standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Premium Seafood */}
            <div className="group animate-scale-in hover:scale-105 transition-all duration-300">
              <Card className="card-elevated overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src="/src/assets/premium-seafood.jpg" 
                      alt="Premium Seafood Selection"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-xl font-poppins font-bold text-white mb-2">Premium Seafood</h3>
                      <p className="text-white/90 text-sm">Fresh catch from global waters</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quality Beef */}
            <div className="group animate-scale-in hover:scale-105 transition-all duration-300" style={{ animationDelay: '0.1s' }}>
              <Card className="card-elevated overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src="/src/assets/beef-lamb.jpg" 
                      alt="Premium Beef Products"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-xl font-poppins font-bold text-white mb-2">Premium Beef</h3>
                      <p className="text-white/90 text-sm">Grade A cuts and specialty products</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fresh Poultry */}
            <div className="group animate-scale-in hover:scale-105 transition-all duration-300" style={{ animationDelay: '0.2s' }}>
              <Card className="card-elevated overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src="/src/assets/fresh-poultry.jpg" 
                      alt="Fresh Poultry Products"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-xl font-poppins font-bold text-white mb-2">Fresh Poultry</h3>
                      <p className="text-white/90 text-sm">Farm-fresh chicken and turkey</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quality Pork */}
            <div className="group animate-scale-in hover:scale-105 transition-all duration-300" style={{ animationDelay: '0.3s' }}>
              <Card className="card-elevated overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src="/src/assets/quality-pork.jpg" 
                      alt="Quality Pork Products"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-xl font-poppins font-bold text-white mb-2">Quality Pork</h3>
                      <p className="text-white/90 text-sm">Premium cuts and specialty items</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Product CTA */}
          <div className="text-center mt-16 animate-fade-in">
            <Button asChild className="btn-hero text-lg px-8 py-4">
              <Link to="/products">
                <Package className="h-5 w-5 mr-2" />
                Explore All Products
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;