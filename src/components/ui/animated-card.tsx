import * as React from "react";
import { Card } from "./card";
import { cn } from "@/lib/utils";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  animation?: 'lift' | 'scale' | 'fade' | 'slide' | 'glow';
  delay?: number;
  scrollAnimation?: boolean;
}

export const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ 
    className, 
    animation = 'lift', 
    delay = 0, 
    scrollAnimation = false,
    children, 
    ...props 
  }, ref) => {
    const { elementRef, isVisible } = useScrollAnimation();
    const [hasAnimated, setHasAnimated] = React.useState(!scrollAnimation);

    React.useEffect(() => {
      if (scrollAnimation && isVisible && !hasAnimated) {
        setTimeout(() => {
          setHasAnimated(true);
        }, delay);
      }
    }, [isVisible, hasAnimated, delay, scrollAnimation]);

    const getAnimationClasses = () => {
      const baseClasses = 'transition-all duration-300';
      
      switch (animation) {
        case 'scale':
          return `${baseClasses} hover:scale-105 hover:shadow-lg`;
        case 'fade':
          return `${baseClasses} hover:opacity-90`;
        case 'slide':
          return `${baseClasses} hover:transform hover:-translate-y-1`;
        case 'glow':
          return `${baseClasses} hover:shadow-glow`;
        case 'lift':
        default:
          return `${baseClasses} hover-lift-shadow`;
      }
    };

    const scrollClasses = scrollAnimation 
      ? `scroll-fade ${hasAnimated ? 'in-view' : ''}`
      : '';

    return (
      <Card
        ref={scrollAnimation ? (elementRef as any) : ref}
        className={cn(
          'card-elevated',
          getAnimationClasses(),
          scrollClasses,
          className
        )}
        {...props}
      >
        {children}
      </Card>
    );
  }
);

AnimatedCard.displayName = "AnimatedCard";