import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  badge?: string;
  footer?: React.ReactNode;
  image?: string;
  imageAlt?: string;
  interactive?: boolean;
  featured?: boolean;
}

export const LiquidGlassCard = React.forwardRef<HTMLDivElement, LiquidGlassCardProps>(
  ({ 
    className, 
    title,
    description,
    icon: Icon,
    iconColor = "text-primary",
    badge,
    footer,
    image,
    imageAlt,
    interactive = true,
    featured = false,
    children,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "liquid-glass p-6 font-inter tracking-tight",
          interactive && "ripple-effect shimmer-effect cursor-pointer",
          featured && "ring-2 ring-primary/20 shadow-2xl",
          "group transition-all duration-300",
          className
        )}
        {...props}
      >
        {/* Image */}
        {image && (
          <div className="mb-4 overflow-hidden rounded-xl">
            <img
              src={image}
              alt={imageAlt || title || "Feature image"}
              className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className={cn(
                "p-2 rounded-xl liquid-glass",
                iconColor,
                "group-hover:scale-110 transition-transform duration-300"
              )}>
                <Icon size={20} />
              </div>
            )}
            <div>
              {title && (
                <h3 className="font-semibold text-lg text-foreground mb-1 tracking-tight">
                  {title}
                </h3>
              )}
              {badge && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md liquid-glass text-primary">
                  {badge}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-foreground/70 text-sm leading-relaxed mb-4 tracking-tight">
            {description}
          </p>
        )}

        {/* Content */}
        {children && (
          <div className="mb-4">
            {children}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className="pt-4 border-t border-white/10">
            {footer}
          </div>
        )}

        {/* Hover glow effect */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent" />
        </div>
      </div>
    );
  }
);

LiquidGlassCard.displayName = "LiquidGlassCard";