import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

interface LiquidGlassNavbarProps extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode;
  navigation?: Array<{
    label: string;
    href: string;
    active?: boolean;
  }>;
  actions?: React.ReactNode;
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

export const LiquidGlassNavbar = React.forwardRef<HTMLElement, LiquidGlassNavbarProps>(
  ({ 
    className, 
    logo, 
    navigation = [], 
    actions, 
    onMenuToggle,
    isMenuOpen = false,
    ...props 
  }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn(
          "liquid-glass sticky top-0 z-50",
          "px-6 py-4 font-inter tracking-tight",
          className
        )}
        {...props}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            {logo}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-xl transition-all duration-300",
                  "ripple-effect shimmer-effect",
                  "hover:bg-white/10 dark:hover:bg-white/5",
                  "font-medium text-sm tracking-tight",
                  item.active 
                    ? "bg-white/15 dark:bg-white/10 text-primary" 
                    : "text-foreground/80 hover:text-foreground"
                )}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {actions}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden liquid-glass ripple-effect"
            onClick={onMenuToggle}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/10">
            <div className="space-y-2">
              {navigation.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  className={cn(
                    "block px-4 py-3 rounded-xl transition-all duration-300",
                    "ripple-effect shimmer-effect",
                    "hover:bg-white/10 dark:hover:bg-white/5",
                    "font-medium text-sm tracking-tight",
                    item.active 
                      ? "bg-white/15 dark:bg-white/10 text-primary" 
                      : "text-foreground/80 hover:text-foreground"
                  )}
                >
                  {item.label}
                </a>
              ))}
              {actions && (
                <div className="pt-3 border-t border-white/10">
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    );
  }
);

LiquidGlassNavbar.displayName = "LiquidGlassNavbar";