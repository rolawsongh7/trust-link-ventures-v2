import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Building2, 
  User, 
  LogOut, 
  Settings,
  ShoppingCart,
  FileText,
  Package,
  MessageSquare,
  Grid3X3,
  ChevronDown,
  MapPin,
  Menu
} from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { usePendingAddressRequests } from '@/hooks/usePendingAddressRequests';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';

export const CustomerNavigation: React.FC = () => {
  const { profile, signOut } = useCustomerAuth();
  const { totalItems } = useShoppingCart();
  const { pendingCount } = usePendingAddressRequests();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const navigationItems: Array<{
    title: string;
    href: string;
    icon: any;
    badge?: number;
    badgeVariant?: 'default' | 'destructive' | 'outline' | 'secondary';
  }> = [
    {
      title: 'Dashboard',
      href: '/customer',
      icon: Grid3X3
    },
    {
      title: 'Catalog',
      href: '/customer/catalog',
      icon: Package
    },
    {
      title: 'Cart',
      href: '/customer/cart',
      icon: ShoppingCart,
      badge: totalItems > 0 ? totalItems : undefined
    },
    {
      title: 'Quotes',
      href: '/customer/quotes',
      icon: FileText
    },
    {
      title: 'Orders',
      href: '/customer/orders',
      icon: Package,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeVariant: 'destructive' as const
    },
    {
      title: 'Invoices',
      href: '/customer/invoices',
      icon: FileText
    },
    {
      title: 'Addresses',
      href: '/customer/addresses',
      icon: MapPin
    },
    {
      title: 'Messages',
      href: '/customer/communications',
      icon: MessageSquare
    }
  ];

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('🔄 Navigation sign out triggered');
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error in navigation:', error);
      // Force redirect as fallback
      window.location.href = '/';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TooltipProvider>
      <nav className="bg-white/95 backdrop-blur-sm border-b-2 border-primary/10 shadow-md sticky top-0 z-[100] min-h-[64px] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20 gap-2 sm:gap-3 md:gap-4">
            {/* Logo and Company Info */}
            <div className="flex items-center flex-shrink-0">
              <Link to="/customer" className="flex items-center gap-3 sm:gap-4 touch-manipulation">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                </div>
                <div className="hidden sm:block flex-shrink-0 max-w-[180px] md:max-w-[220px]">
                  <div className="text-sm font-semibold text-primary truncate">
                    {profile?.company_name}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    Customer Portal
                  </div>
                </div>
              </Link>
            </div>

          {/* Tablet Navigation - Icon Only with Tooltips (768px-1024px) */}
          <div className="hidden md:flex lg:hidden items-center gap-1 overflow-x-auto no-scrollbar">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link to={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        size="icon"
                        className="relative h-10 w-10 touch-safe flex-shrink-0"
                      >
                        <Icon className="h-5 w-5" />
                        {item.badge && (
                          <Badge 
                            variant={item.badgeVariant || "destructive"}
                            className={`absolute top-0 right-0 h-5 w-5 p-0 text-xs flex items-center justify-center transform translate-x-1/2 -translate-y-1/2 ${
                              item.badgeVariant === 'destructive' ? 'bg-orange-500 hover:bg-orange-600' : ''
                            }`}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{item.title}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Desktop Navigation - Full Text (1024px+) */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2 overflow-x-auto no-scrollbar">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="relative h-10 touch-manipulation whitespace-nowrap px-2 xl:px-3 flex-shrink-0"
                  >
                    <Icon className="h-4 w-4 mr-1 xl:mr-2" />
                    <span className="text-xs xl:text-sm">{item.title}</span>
                    {item.badge && (
                      <Badge 
                        variant={item.badgeVariant || "destructive"}
                        className={`absolute top-0 right-0 h-5 w-5 p-0 text-xs flex items-center justify-center transform translate-x-1/2 -translate-y-1/2 ${
                          item.badgeVariant === 'destructive' ? 'bg-orange-500 hover:bg-orange-600' : ''
                        }`}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-10 w-10 touch-safe flex-shrink-0"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[340px] md:w-[380px]">
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-1">
                  {navigationItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;
                    
                    return (
                      <Link 
                        key={item.href} 
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className="w-full justify-start h-12 text-base touch-safe"
                        >
                          <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                          <span className="flex-1 text-left">{item.title}</span>
                          {item.badge && (
                            <Badge 
                              variant={item.badgeVariant || "destructive"}
                              className={`ml-2 h-6 w-6 p-0 text-xs flex items-center justify-center flex-shrink-0 ${
                                item.badgeVariant === 'destructive' ? 'bg-orange-500 hover:bg-orange-600' : ''
                              }`}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-1 sm:gap-2 h-10 px-1 sm:px-2 md:px-3 touch-safe flex-shrink-0"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:block text-left min-w-0 max-w-[120px] xl:max-w-[160px]">
                    <div className="text-sm font-medium truncate">{profile?.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {profile?.email}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {profile?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild>
                  <Link to="/customer/profile" className="flex items-center w-full touch-safe">
                    <User className="h-4 w-4 mr-2" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link to="/customer" className="flex items-center w-full touch-safe">
                    <Settings className="h-4 w-4 mr-2" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive cursor-pointer touch-safe"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>
        </div>
      </nav>
    </TooltipProvider>
  );
};