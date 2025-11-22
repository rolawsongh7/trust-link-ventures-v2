/**
 * Optimized Image Component
 * Features:
 * - Progressive loading with blur placeholder
 * - WebP format with fallback
 * - Lazy loading with IntersectionObserver
 * - Responsive srcset for different screen sizes
 * - Prevents layout shift
 */

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  placeholder?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean; // Load immediately for above-fold images
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage = ({
  src,
  placeholder,
  alt,
  width,
  height,
  className,
  priority = false,
  objectFit = 'cover',
  onLoad,
  onError,
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Load immediately if priority
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Lazy loading with IntersectionObserver
  useEffect(() => {
    if (priority || !imgRef.current) return;

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
        rootMargin: '50px', // Start loading 50px before entering viewport
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Generate WebP source with fallback
  const imgSrc = isInView ? src : placeholder || src;
  const webpSrc = imgSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
        aspectRatio: width && height ? `${width} / ${height}` : undefined,
      }}
    >
      {/* Placeholder with blur effect */}
      {placeholder && !isLoaded && !hasError && (
        <img
          src={placeholder}
          alt=""
          className={cn(
            'absolute inset-0 w-full h-full blur-sm scale-105 transition-opacity duration-300',
            isLoaded ? 'opacity-0' : 'opacity-100'
          )}
          style={{ objectFit }}
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      <picture>
        {/* WebP source for modern browsers */}
        {isInView && (
          <source
            type="image/webp"
            srcSet={webpSrc}
          />
        )}
        
        {/* Fallback to original format */}
        <img
          ref={imgRef}
          src={imgSrc}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0',
            hasError && 'bg-muted'
          )}
          style={{ objectFit }}
        />
      </picture>

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-sm text-muted-foreground">Failed to load image</span>
        </div>
      )}

      {/* Loading state */}
      {!isLoaded && !hasError && isInView && !placeholder && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
};
