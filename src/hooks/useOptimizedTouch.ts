/**
 * Optimized Touch Handler for iOS
 * Improves touch responsiveness and prevents ghost clicks
 */

import { useCallback, useRef } from 'react';

interface TouchHandlerOptions {
  onTap?: (e: React.TouchEvent | React.MouseEvent) => void;
  onLongPress?: (e: React.TouchEvent | React.MouseEvent) => void;
  longPressDuration?: number;
  preventGhostClick?: boolean;
}

export function useOptimizedTouch({
  onTap,
  onLongPress,
  longPressDuration = 500,
  preventGhostClick = true,
}: TouchHandlerOptions) {
  const touchStartTimeRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const longPressTimerRef = useRef<NodeJS.Timeout>();
  const isLongPressRef = useRef(false);
  const lastTouchEndRef = useRef<number>(0);

  /**
   * Handle touch/click start
   */
  const handleStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      touchStartTimeRef.current = Date.now();
      isLongPressRef.current = false;

      // Get touch/mouse position
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      touchStartPosRef.current = { x: clientX, y: clientY };

      // Start long press timer
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          isLongPressRef.current = true;
          onLongPress(e);
        }, longPressDuration);
      }
    },
    [onLongPress, longPressDuration]
  );

  /**
   * Handle touch/click end
   */
  const handleEnd = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }

      // Check if it was a long press
      if (isLongPressRef.current) {
        isLongPressRef.current = false;
        return;
      }

      // Get end position
      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

      // Check if touch moved too much (not a tap)
      const deltaX = Math.abs(clientX - touchStartPosRef.current.x);
      const deltaY = Math.abs(clientY - touchStartPosRef.current.y);
      
      if (deltaX > 10 || deltaY > 10) {
        return; // User was scrolling, not tapping
      }

      // Check for ghost click (touch event followed by click event)
      const now = Date.now();
      if (preventGhostClick && 'changedTouches' in e) {
        // This is a touch event, prevent subsequent click
        lastTouchEndRef.current = now;
      } else if (preventGhostClick && !('changedTouches' in e)) {
        // This is a click event, check if it's a ghost click
        if (now - lastTouchEndRef.current < 300) {
          return; // Ghost click, ignore
        }
      }

      // Execute tap handler
      if (onTap) {
        onTap(e);
      }
    },
    [onTap, preventGhostClick]
  );

  /**
   * Handle touch/click cancel
   */
  const handleCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    isLongPressRef.current = false;
  }, []);

  /**
   * Handle touch move (cancel long press if user moves)
   */
  const handleMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = Math.abs(clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(clientY - touchStartPosRef.current.y);

    // Cancel long press if user moved more than 10px
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      isLongPressRef.current = false;
    }
  }, []);

  return {
    onTouchStart: handleStart,
    onTouchEnd: handleEnd,
    onTouchCancel: handleCancel,
    onTouchMove: handleMove,
    onMouseDown: handleStart,
    onMouseUp: handleEnd,
    // Use passive listeners for better scrolling performance
    style: { touchAction: 'manipulation' },
  };
}

/**
 * Debounce touch handler to prevent rapid firing
 */
export function useDebouncedTouch(
  callback: () => void,
  delay: number = 300
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastCallRef = useRef<number>(0);

  const debouncedCallback = useCallback(() => {
    const now = Date.now();
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If called too soon, debounce
    if (now - lastCallRef.current < delay) {
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callback();
      }, delay);
    } else {
      // Execute immediately
      lastCallRef.current = now;
      callback();
    }
  }, [callback, delay]);

  return debouncedCallback;
}
