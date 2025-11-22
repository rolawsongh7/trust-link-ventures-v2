/**
 * Performance Monitoring Utility
 * Tracks key performance metrics for App Store compliance
 */

import { FEATURES } from '@/config/features';

export interface PerformanceMetrics {
  fps: number;
  memory: number;
  loadTime: number;
  renderTime: number;
  bundleSize?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 60,
    memory: 0,
    loadTime: 0,
    renderTime: 0,
  };

  private fpsFrames: number[] = [];
  private lastFrameTime = performance.now();
  private rafId?: number;
  private observers: Set<(metrics: PerformanceMetrics) => void> = new Set();

  constructor() {
    if (!FEATURES.enablePerformanceMonitoring) return;
    
    this.startMonitoring();
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring() {
    // Measure initial load time
    if (typeof window !== 'undefined' && window.performance) {
      window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (perfData) {
          this.metrics.loadTime = perfData.loadEventEnd - perfData.fetchStart;
          this.notifyObservers();
        }
      });
    }

    // Monitor FPS
    this.monitorFPS();

    // Monitor memory (if available)
    if (typeof window !== 'undefined' && 'memory' in performance) {
      this.monitorMemory();
    }

    // Monitor long tasks
    this.monitorLongTasks();
  }

  /**
   * Monitor frames per second
   */
  private monitorFPS() {
    const measureFrame = (currentTime: number) => {
      const delta = currentTime - this.lastFrameTime;
      const fps = Math.round(1000 / delta);
      
      this.fpsFrames.push(fps);
      
      // Keep last 60 frames for average
      if (this.fpsFrames.length > 60) {
        this.fpsFrames.shift();
      }

      // Calculate average FPS
      const avgFps = Math.round(
        this.fpsFrames.reduce((a, b) => a + b, 0) / this.fpsFrames.length
      );
      
      this.metrics.fps = avgFps;
      this.lastFrameTime = currentTime;
      
      // Warn if FPS drops below 30
      if (avgFps < 30) {
        console.warn('[Performance] Low FPS detected:', avgFps);
      }

      this.notifyObservers();
      this.rafId = requestAnimationFrame(measureFrame);
    };

    this.rafId = requestAnimationFrame(measureFrame);
  }

  /**
   * Monitor memory usage (Chrome/Edge only)
   */
  private monitorMemory() {
    const measure = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        // Convert to MB
        this.metrics.memory = Math.round(memory.usedJSHeapSize / 1048576);
        
        // Warn if memory exceeds 150MB
        if (this.metrics.memory > 150) {
          console.warn('[Performance] High memory usage:', this.metrics.memory, 'MB');
        }
      }
      
      setTimeout(measure, 1000); // Check every second
    };

    measure();
  }

  /**
   * Monitor long tasks (>50ms)
   */
  private monitorLongTasks() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              console.warn('[Performance] Long task detected:', entry.duration.toFixed(2), 'ms');
            }
          }
        });

        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Long task API not supported
      }
    }
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.observers.add(callback);
    // Immediately notify with current metrics
    callback(this.metrics);
    
    return () => {
      this.observers.delete(callback);
    };
  }

  /**
   * Notify all observers
   */
  private notifyObservers() {
    this.observers.forEach((callback) => callback(this.metrics));
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  /**
   * Log metrics summary
   */
  logSummary() {
    console.group('[Performance Summary]');
    console.log('📊 FPS:', this.metrics.fps);
    console.log('💾 Memory:', this.metrics.memory, 'MB');
    console.log('⚡ Load Time:', this.metrics.loadTime.toFixed(2), 'ms');
    console.log('🎨 Render Time:', this.metrics.renderTime.toFixed(2), 'ms');
    console.groupEnd();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Measure component render time
 */
export function measureRender(componentName: string): () => void {
  const startTime = performance.now();
  
  return () => {
    const duration = performance.now() - startTime;
    if (duration > 16) { // Longer than one frame at 60fps
      console.warn(`[Performance] Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
    }
  };
}

/**
 * Check if app meets performance requirements
 */
export function checkPerformanceRequirements(): {
  passed: boolean;
  issues: string[];
} {
  const metrics = performanceMonitor.getMetrics();
  const issues: string[] = [];

  // Check launch time (< 3 seconds)
  if (metrics.loadTime > 3000) {
    issues.push(`Launch time too slow: ${metrics.loadTime}ms (target: <3000ms)`);
  }

  // Check FPS (should be >= 50)
  if (metrics.fps < 50) {
    issues.push(`FPS too low: ${metrics.fps} (target: >=50)`);
  }

  // Check memory (< 150MB)
  if (metrics.memory > 150) {
    issues.push(`Memory usage too high: ${metrics.memory}MB (target: <150MB)`);
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
