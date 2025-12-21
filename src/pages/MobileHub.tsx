import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, MessageSquare, HelpCircle, ArrowRight, Snowflake, Shield, Truck, LogIn, LayoutDashboard } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { categorySlides } from '@/data/categorySlides';
import trustLinkLogo from '@/assets/trust-link-logo.png';

const MobileHub: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useCustomerAuth();
  const { totalItems } = useShoppingCart();

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

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-4 flex items-center gap-3">
          <img src={trustLinkLogo} alt="Trust Link" className="h-10 w-10" />
          <div>
            <h1 className="text-lg font-poppins font-bold text-foreground">Trust Link Hub</h1>
            <p className="text-xs text-muted-foreground">Premium Frozen Foods</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-8">
        {/* Welcome Section */}
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

        {/* Primary CTA */}
        <section>
          {user ? (
            <Button
              onClick={() => navigate('/portal')}
              variant="outline"
              className="w-full justify-between h-14 text-base"
            >
              <span className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" />
                Go to My Dashboard
              </span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              onClick={() => navigate('/portal-auth')}
              className="w-full h-14 text-base gap-2"
            >
              <LogIn className="h-5 w-5" />
              Sign In to Get Started
            </Button>
          )}
        </section>

        {/* Featured Products Carousel */}
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
          
          <Carousel className="w-full" opts={{ align: 'start', loop: true }}>
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
        </section>

        {/* Quick Actions Grid */}
        <section className="space-y-4">
          <h3 className="text-lg font-poppins font-semibold text-foreground">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className="relative flex flex-col items-center justify-center p-5 rounded-2xl bg-card border border-border active:scale-[0.97] transition-all touch-manipulation"
                >
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} mb-3`}>
                    <Icon className={`h-6 w-6 ${action.iconColor}`} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                  {action.badge && action.badge > 0 && (
                    <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center font-semibold">
                      {action.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Promotions Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-poppins font-semibold text-foreground">What's New</h3>
          <Card className="overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Package className="h-6 w-6 text-primary" />
                </div>
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
        </section>

        {/* Value Proposition */}
        <section className="space-y-4">
          <h3 className="text-lg font-poppins font-semibold text-foreground">Why Trust Link?</h3>
          <div className="grid grid-cols-3 gap-3">
            {valueProps.map((prop, index) => {
              const Icon = prop.icon;
              return (
                <div 
                  key={index}
                  className="flex flex-col items-center text-center p-4 rounded-xl bg-card border border-border"
                >
                  <div className="p-2 rounded-lg bg-primary/10 mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">{prop.label}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{prop.description}</span>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default MobileHub;
