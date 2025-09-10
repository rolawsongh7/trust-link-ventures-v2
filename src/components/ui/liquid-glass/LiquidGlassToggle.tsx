import * as React from "react";
import { cn } from "@/lib/utils";

interface LiquidGlassToggleProps extends Omit<React.HTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const LiquidGlassToggle = React.forwardRef<HTMLButtonElement, LiquidGlassToggleProps>(
  ({ 
    className, 
    checked = false, 
    onChange, 
    size = 'md',
    label,
    description,
    disabled = false,
    ...props 
  }, ref) => {
    const handleToggle = () => {
      if (!disabled && onChange) {
        onChange(!checked);
      }
    };

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return {
            container: 'w-10 h-6',
            thumb: 'w-4 h-4',
            translate: checked ? 'translate-x-4' : 'translate-x-1'
          };
        case 'lg':
          return {
            container: 'w-16 h-8',
            thumb: 'w-6 h-6',
            translate: checked ? 'translate-x-8' : 'translate-x-1'
          };
        default:
          return {
            container: 'w-12 h-6',
            thumb: 'w-4 h-4',
            translate: checked ? 'translate-x-6' : 'translate-x-1'
          };
      }
    };

    const sizeClasses = getSizeClasses();

    const ToggleComponent = (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          "relative inline-flex items-center rounded-full transition-all duration-300",
          "liquid-glass ripple-effect shimmer-effect",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
          "font-inter tracking-tight",
          sizeClasses.container,
          checked 
            ? "bg-primary/20 border-primary/30" 
            : "bg-white/10 dark:bg-white/5 border-white/20",
          disabled 
            ? "opacity-50 cursor-not-allowed" 
            : "cursor-pointer hover:scale-105",
          className
        )}
        {...props}
      >
        {/* Thumb */}
        <span
          className={cn(
            "inline-block rounded-full transition-all duration-300",
            "liquid-glass shadow-lg",
            sizeClasses.thumb,
            sizeClasses.translate,
            checked 
              ? "bg-primary border-primary/50 shadow-primary/20" 
              : "bg-white/80 dark:bg-white/60 border-white/40"
          )}
        />

        {/* Glow effect when checked */}
        {checked && (
          <span 
            className={cn(
              "absolute inset-0 rounded-full opacity-50",
              "bg-gradient-to-r from-primary/30 to-primary/10",
              "animate-pulse"
            )}
          />
        )}
      </button>
    );

    if (label || description) {
      return (
        <div className="flex items-start space-x-3">
          {ToggleComponent}
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-foreground tracking-tight font-inter">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-foreground/60 tracking-tight font-inter">
                {description}
              </span>
            )}
          </div>
        </div>
      );
    }

    return ToggleComponent;
  }
);

LiquidGlassToggle.displayName = "LiquidGlassToggle";