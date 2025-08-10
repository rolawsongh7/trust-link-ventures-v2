import { useState, useEffect } from 'react';

interface MobileDetectionHook {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenSize: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  viewportWidth: number;
  viewportHeight: number;
}

export const useMobileDetection = (): MobileDetectionHook => {
  const [detection, setDetection] = useState<MobileDetectionHook>({
    isMobile: false,
    isTablet: false,
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
      
      // Screen size detection
      const isMobile = width < 640; // sm breakpoint
      const isTablet = width >= 640 && width < 1024; // sm to lg breakpoint
      const isDesktop = width >= 1024; // lg breakpoint and above
      
      // Touch device detection
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Screen size category
      let screenSize: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      if (isMobile) screenSize = 'mobile';
      else if (isTablet) screenSize = 'tablet';
      
      // Orientation detection
      const orientation = height > width ? 'portrait' : 'landscape';

      setDetection({
        isMobile,
        isTablet,
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
  desktop: T;
}): T => {
  const { screenSize } = useMobileDetection();
  
  switch (screenSize) {
    case 'mobile':
      return values.mobile;
    case 'tablet':
      return values.tablet ?? values.desktop;
    case 'desktop':
      return values.desktop;
    default:
      return values.desktop;
  }
};

// Hook for conditional mobile rendering
export const useMobileConditional = () => {
  const { isMobile, isTablet, isDesktop, isTouchDevice } = useMobileDetection();
  
  const showOnMobile = (content: React.ReactNode) => isMobile ? content : null;
  const showOnTablet = (content: React.ReactNode) => isTablet ? content : null;
  const showOnDesktop = (content: React.ReactNode) => isDesktop ? content : null;
  const showOnTouch = (content: React.ReactNode) => isTouchDevice ? content : null;
  const hideOnMobile = (content: React.ReactNode) => !isMobile ? content : null;
  
  return {
    showOnMobile,
    showOnTablet,
    showOnDesktop,
    showOnTouch,
    hideOnMobile,
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice
  };
};