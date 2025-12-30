import { useState, useEffect } from 'react';

interface MobileDetectionHook {
  isMobile: boolean;
  isTablet: boolean;
  isLargeTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenSize: 'mobile' | 'tablet' | 'large-tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  viewportWidth: number;
  viewportHeight: number;
}

export const useMobileDetection = (): MobileDetectionHook => {
  const [detection, setDetection] = useState<MobileDetectionHook>({
    isMobile: false,
    isTablet: false,
    isLargeTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    screenSize: 'desktop',
    orientation: 'landscape',
    viewportWidth: 0,
    viewportHeight: 0
  });

  useEffect(() => {
    const updateDetection = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Screen size detection - updated breakpoints
      const isMobile = width < 640; // sm breakpoint
      const isTablet = width >= 640 && width < 1024; // sm to lg breakpoint
      const isLargeTablet = width >= 1024 && width < 1280; // lg to xl breakpoint (iPad Pro 13")
      const isDesktop = width >= 1280; // xl breakpoint and above
      
      // Touch device detection
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Screen size category
      let screenSize: 'mobile' | 'tablet' | 'large-tablet' | 'desktop' = 'desktop';
      if (isMobile) screenSize = 'mobile';
      else if (isTablet) screenSize = 'tablet';
      else if (isLargeTablet) screenSize = 'large-tablet';
      
      // Orientation detection
      const orientation = height > width ? 'portrait' : 'landscape';

      setDetection({
        isMobile,
        isTablet,
        isLargeTablet,
        isDesktop,
        isTouchDevice,
        screenSize,
        orientation,
        viewportWidth: width,
        viewportHeight: height
      });
    };

    // Initial detection
    updateDetection();

    // Listen for resize events
    window.addEventListener('resize', updateDetection);
    window.addEventListener('orientationchange', updateDetection);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateDetection);
      window.removeEventListener('orientationchange', updateDetection);
    };
  }, []);

  return detection;
};

// Hook for responsive values
export const useResponsiveValue = <T,>(values: {
  mobile: T;
  tablet?: T;
  largeTablet?: T;
  desktop: T;
}): T => {
  const { screenSize } = useMobileDetection();
  
  switch (screenSize) {
    case 'mobile':
      return values.mobile;
    case 'tablet':
      return values.tablet ?? values.desktop;
    case 'large-tablet':
      return values.largeTablet ?? values.desktop;
    case 'desktop':
      return values.desktop;
    default:
      return values.desktop;
  }
};

// Hook for conditional mobile rendering
export const useMobileConditional = () => {
  const { isMobile, isTablet, isLargeTablet, isDesktop, isTouchDevice } = useMobileDetection();
  
  const showOnMobile = (content: React.ReactNode) => isMobile ? content : null;
  const showOnTablet = (content: React.ReactNode) => isTablet ? content : null;
  const showOnLargeTablet = (content: React.ReactNode) => isLargeTablet ? content : null;
  const showOnDesktop = (content: React.ReactNode) => isDesktop ? content : null;
  const showOnTouch = (content: React.ReactNode) => isTouchDevice ? content : null;
  const hideOnMobile = (content: React.ReactNode) => !isMobile ? content : null;
  
  return {
    showOnMobile,
    showOnTablet,
    showOnLargeTablet,
    showOnDesktop,
    showOnTouch,
    hideOnMobile,
    isMobile,
    isTablet,
    isLargeTablet,
    isDesktop,
    isTouchDevice
  };
};