import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, ShoppingCart, MessageSquare, HelpCircle, ArrowRight, Snowflake, Shield, Truck, LogIn, LayoutDashboard, Loader2, Users, Clock, Star, Zap, Fish } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from '@/components/ui/carousel';
import { categorySlides } from '@/data/categorySlides';
import { cardHover } from '@/lib/animations';
import { ProcessCarousel } from '@/components/mobile/ProcessCarousel';
import trustLinkLogo from '@/assets/trust-link-logo.png';
import heroBackground from '@/assets/cold-storage-hero.jpg';

const MobileHub: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useCustomerAuth();
  const { totalItems } = useShoppingCart();
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Carousel state for auto-play and indicators
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideCount, setSlideCount] = useState(0);

  const handleNavigateToDashboard = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    navigate('/portal');
  };

  const handleNavigateToAuth = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    navigate('/portal-auth');
  };

  // Scroll animations for sections
  const { elementRef: promotionsRef, isVisible: promotionsVisible } = useScrollAnimation({ threshold: 0.2 });
  const { elementRef: valuePropsRef, isVisible: valuePropsVisible } = useScrollAnimation({ threshold: 0.2 });

  // Auto-play carousel
  useEffect(() => {
    if (!carouselApi) return;

    setSlideCount(carouselApi.scrollSnapList().length);
    setCurrentSlide(carouselApi.selectedScrollSnap());

    carouselApi.on('select', () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });

    const autoplayInterval = setInterval(() => {
      if (carouselApi.canScrollNext()) {
        carouselApi.scrollNext();
      } else {
        carouselApi.scrollTo(0);
      }
    }, 4000);

    return () => clearInterval(autoplayInterval);
  }, [carouselApi]);

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    {
      label: 'Browse Products',
      icon: Package,
      path: '/portal/catalog',
      color: 'from-primary/20 to-primary/10',
      iconColor: 'text-primary'
    },
    {
      label: 'Shopping Cart',
      icon: ShoppingCart,
      path: '/portal/cart',
      color: 'from-orange-500/20 to-orange-500/10',
      iconColor: 'text-orange-500',
      badge: totalItems
    },
    {
      label: 'Contact Us',
      icon: MessageSquare,
      path: '/contact',
      color: 'from-green-500/20 to-green-500/10',
      iconColor: 'text-green-500'
    },
    {
      label: 'Help & FAQ',
      icon: HelpCircle,
      path: '/portal/help',
      color: 'from-purple-500/20 to-purple-500/10',
      iconColor: 'text-purple-500'
    }
  ];

  const promotions = [
    {
      id: 1,
      title: 'Bulk Order Discounts',
      description: 'Save up to 20% on large orders',
      badge: 'HOT',
      badgeColor: 'from-red-500 to-orange-500',
      icon: Package,
      gradient: 'from-amber-500 to-orange-500'
    },
    {
      id: 2,
      title: 'New Seafood Arrivals',
      description: 'Fresh premium catches available',
      badge: 'NEW',
      badgeColor: 'from-emerald-500 to-green-500',
      icon: Fish,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 3,
      title: 'Express Delivery',
      description: 'Same-day delivery in Accra',
      badge: null,
      badgeColor: null,
      icon: Zap,
      gradient: 'from-purple-500 to-violet-500'
    }
  ];

  const impactStats = [
    { 
      icon: Users, 
      value: '500+', 
      label: 'Partners', 
      description: 'Trusted nationwide',
      gradient: 'from-blue-500 to-blue-600'
    },
    { 
      icon: Package, 
      value: '10K+', 
      label: 'Deliveries', 
      description: 'Monthly orders',
      gradient: 'from-emerald-500 to-green-600'
    },
    { 
      icon: Clock, 
      value: '24/7', 
      label: 'Support', 
      description: 'Always available',
      gradient: 'from-purple-500 to-violet-600'
    }
  ];

  const scrollToSlide = useCallback((index: number) => {
    carouselApi?.scrollTo(index);
  }, [carouselApi]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Section with Background */}
      <div className="relative h-56 overflow-hidden">
        <img 
          src={heroBackground} 
          alt="Trust Link Cold Storage" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
        
        {/* Hero Content - No initial hidden state to prevent flicker */}
        <div className="relative h-full flex flex-col items-center justify-center px-4 text-center">
          <img 
            src={trustLinkLogo} 
            alt="Trust Link" 
            className="h-16 w-16 mb-3 drop-shadow-lg"
          />
          <h1 className="text-2xl font-poppins font-bold text-white drop-shadow-md">
            Trust Link Hub
          </h1>
          <p className="text-white/80 text-sm mt-1">
            Premium Frozen Foods
          </p>
        </div>
      </div>

      <main className="px-4 py-6 space-y-8">
        {/* Welcome Section - No animation to prevent flicker */}
        <section className="space-y-2">
          <h2 className="text-2xl font-poppins font-bold text-foreground">
            {getGreeting()}!
          </h2>
          {user && profile ? (
            <p className="text-muted-foreground">
              Welcome back, <span className="font-medium text-foreground">{profile.full_name || profile.company_name}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">
              Explore our premium selection of frozen foods
            </p>
          )}
        </section>

        {/* Primary CTA with Shimmer - No stagger animation */}
        <section>
          {user ? (
            <Button
              onClick={handleNavigateToDashboard}
              disabled={isNavigating}
              variant="outline"
              className="w-full justify-between h-14 text-base touch-manipulation active:scale-[0.98] transition-transform"
              style={{ touchAction: 'manipulation' }}
            >
              <span className="flex items-center gap-2">
                {isNavigating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LayoutDashboard className="h-5 w-5" />
                )}
                {isNavigating ? 'Loading...' : 'Go to My Dashboard'}
              </span>
              {!isNavigating && <ArrowRight className="h-5 w-5" />}
            </Button>
          ) : (
            <div className="relative overflow-hidden rounded-md">
              <Button
                onClick={handleNavigateToAuth}
                disabled={isNavigating}
                className="w-full h-14 text-base gap-2 relative overflow-hidden touch-manipulation active:scale-[0.98] transition-transform"
                style={{ touchAction: 'manipulation' }}
              >
                {isNavigating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="h-5 w-5" />
                )}
                {isNavigating ? 'Loading...' : 'Sign In to Get Started'}
                {/* Shimmer effect */}
                {!isNavigating && (
                  <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                )}
              </Button>
            </div>
          )}
        </section>

        {/* Process Flow Carousel */}
        <ProcessCarousel className="py-2" />

        {/* Featured Products Carousel with Indicators - No stagger animation */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-poppins font-semibold text-foreground">Featured Products</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/portal/catalog')}
              className="text-primary"
            >
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          <Carousel 
            className="w-full" 
            opts={{ align: 'start', loop: true }}
            setApi={setCarouselApi}
          >
            <CarouselContent className="-ml-2">
              {categorySlides.map((category, index) => (
                <CarouselItem key={index} className="pl-2 basis-[75%]">
                  <Card 
                    className="overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => navigate('/portal/catalog')}
                  >
                    <CardContent className="p-0">
                      <div className="relative h-40">
                        <img 
                          src={category.image} 
                          alt={category.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h4 className="text-white font-poppins font-semibold">{category.title}</h4>
                          <p className="text-white/80 text-sm line-clamp-1">{category.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {/* Carousel Indicators */}
          <div className="flex justify-center gap-1.5">
            {Array.from({ length: slideCount }).map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'w-6 bg-primary' 
                    : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </section>

        {/* Quick Actions Grid - Glassmorphism Premium */}
        <section className="space-y-4">
          <h3 className="text-lg font-poppins font-semibold text-foreground">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className="group relative flex flex-col items-center justify-center p-5 rounded-2xl 
                    bg-white/90 dark:bg-slate-900/90 backdrop-blur-md
                    border border-white/30 dark:border-white/10
                    shadow-[0_4px_20px_rgba(0,0,0,0.08)]
                    touch-manipulation transition-all duration-300"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <motion.div 
                    className={`h-14 w-14 rounded-full bg-gradient-to-br ${action.color} 
                      flex items-center justify-center shadow-lg mb-3`}
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <Icon className={`h-6 w-6 ${action.iconColor}`} />
                  </motion.div>
                  <span className="text-sm font-semibold text-foreground">{action.label}</span>
                  {action.badge && action.badge > 0 && (
                    <span className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs rounded-full min-w-[22px] h-[22px] px-1.5 flex items-center justify-center font-bold shadow-lg animate-pulse">
                      {action.badge}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Promotions Section - Premium Carousel */}
        <motion.section 
          ref={promotionsRef as React.RefObject<HTMLElement>}
          className="space-y-4"
          initial={{ opacity: 0, y: 30 }}
          animate={promotionsVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h3 className="text-lg font-poppins font-semibold text-foreground">What's New</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
            {promotions.map((promo, index) => {
              const Icon = promo.icon;
              return (
                <motion.div
                  key={promo.id}
                  className="flex-shrink-0 w-[280px] snap-start"
                  initial={{ opacity: 0, x: 20 }}
                  animate={promotionsVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div 
                    className="relative p-5 rounded-2xl 
                      bg-white/90 dark:bg-slate-900/90 backdrop-blur-md
                      border border-white/30 dark:border-white/10
                      shadow-[0_4px_20px_rgba(0,0,0,0.08)]
                      hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]
                      transition-all duration-300 h-full"
                  >
                    {/* Badge */}
                    {promo.badge && (
                      <span className={`absolute top-3 right-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide
                        bg-gradient-to-r ${promo.badgeColor} text-white rounded-full shadow-lg`}>
                        {promo.badge}
                      </span>
                    )}
                    
                    <motion.div 
                      className={`h-12 w-12 rounded-full bg-gradient-to-br ${promo.gradient} 
                        flex items-center justify-center shadow-lg mb-4`}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </motion.div>
                    
                    <h4 className="font-semibold text-foreground mb-1">{promo.title}</h4>
                    <p className="text-sm text-muted-foreground mb-4">{promo.description}</p>
                    
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="px-0 text-primary hover:text-primary/80"
                      onClick={() => navigate('/contact')}
                    >
                      Learn More <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Impact Statistics with Scroll Reveal */}
        <motion.section 
          ref={valuePropsRef as React.RefObject<HTMLElement>}
          className="space-y-4"
          initial={{ opacity: 0, y: 30 }}
          animate={valuePropsVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
          <h3 className="text-lg font-poppins font-semibold text-foreground">Why Trust Link?</h3>
          <div className="grid grid-cols-3 gap-3">
            {impactStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div 
                  key={index}
                  className="group flex flex-col items-center text-center p-4 rounded-2xl 
                    bg-white/90 dark:bg-slate-900/90 backdrop-blur-md
                    border border-white/30 dark:border-white/10
                    shadow-[0_4px_20px_rgba(0,0,0,0.08)]
                    hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]
                    transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={valuePropsVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                >
                  <motion.div 
                    className={`h-12 w-12 rounded-full bg-gradient-to-br ${stat.gradient} 
                      flex items-center justify-center shadow-lg mb-3`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </motion.div>
                  <span className={`text-xl font-bold bg-gradient-to-r ${stat.gradient} 
                    bg-clip-text text-transparent`}>
                    {stat.value}
                  </span>
                  <span className="text-xs font-semibold text-foreground mt-1">{stat.label}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{stat.description}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default MobileHub;
