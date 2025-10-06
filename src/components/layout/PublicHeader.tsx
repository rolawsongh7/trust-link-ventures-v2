import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, Menu, X } from 'lucide-react';
import { useState } from 'react';
import trustLinkLogo from '@/assets/trust-link-logo.png';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export const PublicHeader = () => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Component refreshed to fix caching issue

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Products', href: '/products' },
    
    { name: 'Partners', href: '/partners' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-background/90">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex w-full items-center justify-between py-3 md:py-4 lg:py-6 lg:border-none">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 md:space-x-3 touch-manipulation">
              <img 
                src={trustLinkLogo} 
                alt="Trust Link Ventures Logo" 
                className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 object-contain"
              />
              <span className="text-base sm:text-lg md:text-2xl font-poppins font-bold gradient-text leading-tight">
                <span className="hidden sm:inline">Trust Link<br />Ventures</span>
                <span className="sm:hidden">Trust Link<br />Ventures</span>
              </span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="ml-10 hidden space-x-6 xl:space-x-8 lg:block">
            {navigation.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-sm xl:text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2 px-1 rounded-md hover:bg-muted/50"
              >
                {link.name}
              </Link>
            ))}
          </div>
          
          {/* Auth Actions */}
          <div className="ml-4 md:ml-6 flex items-center space-x-2 md:space-x-4">
            {user && <NotificationCenter />}
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hidden sm:flex touch-manipulation">
              <Link to="/login">
                <LogIn className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">Sign In</span>
                <span className="md:hidden">Login</span>
              </Link>
            </Button>
            
            {/* Mobile menu button */}
            <div className="flex lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 touch-manipulation"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5 md:h-6 md:w-6" />
                ) : (
                  <Menu className="h-5 w-5 md:h-6 md:w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden animate-fade-in">
            <div className="space-y-1 pb-4 pt-2">
              {navigation.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="block px-3 py-3 text-base font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50 touch-manipulation"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <Link
                to="/login"
                className="block px-3 py-3 text-base font-medium text-primary hover:text-primary/80 transition-colors rounded-md hover:bg-muted/50 touch-manipulation sm:hidden"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};