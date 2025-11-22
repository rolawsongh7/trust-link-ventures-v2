import React, { lazy, Suspense, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Lazy load a component with a fallback loading state
 */
export function lazyLoadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return (props: React.ComponentProps<T>) => (
    <Suspense
      fallback={
        fallback || (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="space-y-4 w-full max-w-md">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        )
      }
    >
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Preload a lazy-loaded component
 */
export function preloadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  return importFunc();
}

/**
 * Lazy load an image with intersection observer
 */
export const LazyImage: React.FC<
  React.ImgHTMLAttributes<HTMLImageElement> & {
    src: string;
    alt: string;
    placeholder?: string;
  }
> = ({ src, alt, placeholder, className, ...props }) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  const [isLoaded, setIsLoaded] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`transition-opacity duration-300 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      onLoad={() => setIsLoaded(true)}
      loading="lazy"
      {...props}
    />
  );
};

/**
 * Enhanced Lazy Image with progressive loading and blur effect
 */
export const LazyImageOptimized: React.FC<
  React.ImgHTMLAttributes<HTMLImageElement> & {
    src: string;
    alt: string;
    placeholder?: string;
    width?: number;
    height?: number;
  }
> = ({ src, alt, placeholder, width, height, className, ...props }) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Load 100px before entering viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (isInView && src) {
      setImageSrc(src);
    }
  }, [isInView, src]);

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className || ''}`}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
        aspectRatio: width && height ? `${width} / ${height}` : undefined,
      }}
    >
      {/* Blur placeholder */}
      {placeholder && !isLoaded && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full blur-sm scale-105 transition-opacity duration-500"
          style={{ objectFit: 'cover' }}
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      {isInView && (
        <img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
          decoding="async"
          className={`w-full h-full transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ objectFit: 'cover' }}
          {...props}
        />
      )}

      {/* Loading placeholder */}
      {!isLoaded && isInView && !placeholder && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
};
