import * as React from "react";
import { Button, ButtonProps } from "./button";
import { cn } from "@/lib/utils";

interface AnimatedButtonProps extends ButtonProps {
  animation?: 'ripple' | 'magnetic' | 'press' | 'glow' | 'bounce';
  loading?: boolean;
  loadingText?: string;
}

export const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, animation = 'ripple', loading, loadingText, children, disabled, ...props }, ref) => {
    const getAnimationClasses = () => {
      switch (animation) {
        case 'magnetic':
          return 'magnetic-hover';
        case 'press':
          return 'button-press';
        case 'glow':
          return 'hover:shadow-glow transition-all duration-300';
        case 'bounce':
          return 'hover:animate-bounce';
        case 'ripple':
        default:
          return 'ripple-effect';
      }
    };

    return (
      <Button
        ref={ref}
        className={cn(
          getAnimationClasses(),
          'focus-ring touch-feedback',
          loading && 'cursor-not-allowed opacity-70',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {loadingText && <span>{loadingText}</span>}
          </div>
        ) : (
          children
        )}
      </Button>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";