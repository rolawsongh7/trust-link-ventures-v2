import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, ShoppingCart, MessageSquare, HelpCircle, ArrowRight, Snowflake, Shield, Truck, LogIn, LayoutDashboard, Loader2 } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from '@/components/ui/carousel';
import { categorySlides } from '@/data/categorySlides';
import { staggerContainer, staggerItem, cardHover, badgePulse } from '@/lib/animations';
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

  const valueProps = [
    { icon: Snowflake, label: 'Cold Chain', description: 'Temperature controlled' },
    { icon: Shield, label: 'Quality', description: 'Premium products' },
    { icon: Truck, label: 'Fast Delivery', description: 'Nationwide shipping' }
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
        
        {/* Hero Content */}
        <motion.div 
          className="relative h-full flex flex-col items-center justify-center px-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <motion.img 
            src={trustLinkLogo} 
            alt="Trust Link" 
            className="h-16 w-16 mb-3 drop-shadow-lg"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4, type: 'spring', stiffness: 200 }}
          />
          <motion.h1 
            className="text-2xl font-poppins font-bold text-white drop-shadow-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            Trust Link Hub
          </motion.h1>
          <motion.p 
            className="text-white/80 text-sm mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            Premium Frozen Foods
          </motion.p>
        </motion.div>
      </div>

      <motion.main 
        className="px-4 py-6 space-y-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome Section */}
        <motion.section variants={staggerItem} className="space-y-2">
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
        </motion.section>

        {/* Primary CTA with Shimmer */}
        <motion.section variants={staggerItem}>
          {user ? (
            <motion.div
              variants={cardHover}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
            >
              <Button
                onClick={handleNavigateToDashboard}
                disabled={isNavigating}
                variant="outline"
                className="w-full justify-between h-14 text-base touch-manipulation"
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
            </motion.div>
          ) : (
            <motion.div
              variants={cardHover}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              className="relative overflow-hidden rounded-md"
            >
              <Button
                onClick={handleNavigateToAuth}
                disabled={isNavigating}
                className="w-full h-14 text-base gap-2 relative overflow-hidden touch-manipulation"
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
            </motion.div>
          )}
        </motion.section>

        {/* Featured Products Carousel with Indicators */}
        <motion.section variants={staggerItem} className="space-y-4">
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
                  <motion.div
                    variants={cardHover}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Card 
                      className="overflow-hidden cursor-pointer"
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
                  </motion.div>
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
        </motion.section>

        {/* Quick Actions Grid with Hover Effects */}
        <motion.section variants={staggerItem} className="space-y-4">
          <h3 className="text-lg font-poppins font-semibold text-foreground">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className="relative flex flex-col items-center justify-center p-5 rounded-2xl bg-card border border-border touch-manipulation"
                  variants={cardHover}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                  custom={index}
                >
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} mb-3`}>
                    <Icon className={`h-6 w-6 ${action.iconColor}`} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                  {action.badge && action.badge > 0 && (
                    <motion.span 
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center font-semibold"
                      variants={badgePulse}
                      initial="initial"
                      animate="animate"
                    >
                      {action.badge}
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        {/* Promotions Section with Scroll Reveal */}
        <motion.section 
          ref={promotionsRef as React.RefObject<HTMLElement>}
          className="space-y-4"
          initial={{ opacity: 0, y: 30 }}
          animate={promotionsVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h3 className="text-lg font-poppins font-semibold text-foreground">What's New</h3>
          <motion.div
            variants={cardHover}
            initial="initial"
            whileHover="hover"
          >
            <Card className="overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <motion.div 
                    className="p-3 rounded-xl bg-primary/20"
                    animate={{ 
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      ease: 'easeInOut' 
                    }}
                  >
                    <Package className="h-6 w-6 text-primary" />
                  </motion.div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">Bulk Order Discounts</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Get special pricing on large orders. Contact us for custom quotes.
                    </p>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => navigate('/contact')}
                    >
                      Learn More
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.section>

        {/* Value Proposition with Scroll Reveal */}
        <motion.section 
          ref={valuePropsRef as React.RefObject<HTMLElement>}
          className="space-y-4"
          initial={{ opacity: 0, y: 30 }}
          animate={valuePropsVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
          <h3 className="text-lg font-poppins font-semibold text-foreground">Why Trust Link?</h3>
          <div className="grid grid-cols-3 gap-3">
            {valueProps.map((prop, index) => {
              const Icon = prop.icon;
              return (
                <motion.div 
                  key={index}
                  className="flex flex-col items-center text-center p-4 rounded-xl bg-card border border-border"
                  initial={{ opacity: 0, y: 20 }}
                  animate={valuePropsVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                >
                  <motion.div 
                    className="p-2 rounded-lg bg-primary/10 mb-2"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <Icon className="h-5 w-5 text-primary" />
                  </motion.div>
                  <span className="text-xs font-semibold text-foreground">{prop.label}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{prop.description}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      </motion.main>
    </div>
  );
};

export default MobileHub;
