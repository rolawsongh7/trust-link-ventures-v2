import * as React from "react";
import { cn } from "@/lib/utils";

interface FocusWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'accent';
  enhance?: boolean;
  trapFocus?: boolean;
}

interface ProgressiveDisclosureProps extends React.HTMLAttributes<HTMLDivElement> {
  expanded: boolean;
  duration?: number;
  children: React.ReactNode;
}

export const FocusWrapper = React.forwardRef<HTMLDivElement, FocusWrapperProps>(
  ({ 
    className, 
    variant = 'primary',
    enhance = true,
    trapFocus = false,
    children, 
    ...props 
  }, ref) => {
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    
    React.useImperativeHandle(ref, () => wrapperRef.current!);

    React.useEffect(() => {
      if (!trapFocus || !wrapperRef.current) return;

      const wrapper = wrapperRef.current;
      const focusableElements = wrapper.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      wrapper.addEventListener('keydown', handleKeyDown);
      return () => wrapper.removeEventListener('keydown', handleKeyDown);
    }, [trapFocus]);

    return (
      <div
        ref={wrapperRef}
        className={cn(
          enhance && 'focus-within-enhanced',
          variant === 'secondary' && 'secondary',
          variant === 'accent' && 'accent',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

export const ProgressiveDisclosure = React.forwardRef<HTMLDivElement, ProgressiveDisclosureProps>(
  ({ 
    className, 
    expanded,
    duration = 300,
    children,
    ...props 
  }, ref) => {
    const [maxHeight, setMaxHeight] = React.useState(0);
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (contentRef.current) {
        if (expanded) {
          setMaxHeight(contentRef.current.scrollHeight);
        } else {
          setMaxHeight(0);
        }
      }
    }, [expanded, children]);

    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden transition-all ease-in-out',
          className
        )}
        style={{
          maxHeight: `${maxHeight}px`,
          transitionDuration: `${duration}ms`,
        }}
        {...props}
      >
        <div ref={contentRef}>
          {children}
        </div>
      </div>
    );
  }
);

interface SmartLoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  loading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const SmartLoading = React.forwardRef<HTMLDivElement, SmartLoadingProps>(
  ({ 
    className, 
    loading,
    loadingText = 'Loading...',
    children,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'smart-loading',
          loading && 'loading',
          className
        )}
        aria-busy={loading}
        aria-label={loading ? loadingText : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

FocusWrapper.displayName = "FocusWrapper";
ProgressiveDisclosure.displayName = "ProgressiveDisclosure";
SmartLoading.displayName = "SmartLoading";