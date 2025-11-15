import * as React from "react";
import { Card } from "./card";
import { cn } from "@/lib/utils";

interface InteractiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'glass' | 'geometric' | 'pattern';
  interactive?: boolean;
  loading?: boolean;
  hapticFeedback?: boolean;
}

export const InteractiveCard = React.forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ 
    className, 
    variant = 'elevated',
    interactive = true,
    loading = false,
    hapticFeedback = false,
    children, 
    ...props 
  }, ref) => {
    const getVariantClasses = () => {
      switch (variant) {
        case 'glass':
          return 'card-glass';
        case 'geometric':
          return 'geometric-border';
        case 'pattern':
          return 'brand-pattern-overlay';
        default:
          return 'card-elevated';
      }
    };

    return (
      <Card
        ref={ref}
        className={cn(
          getVariantClasses(),
          interactive && 'interactive-element cursor-pointer',
          loading && 'smart-loading loading',
          hapticFeedback && 'haptic-feedback',
          'focus-enhanced',
          className
        )}
        style={interactive ? {
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          ...(props.style || {})
        } : props.style}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {children}
      </Card>
    );
  }
);

InteractiveCard.displayName = "InteractiveCard";