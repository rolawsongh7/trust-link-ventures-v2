/**
 * Memory Leak Detection and Monitoring
 * Helps identify and prevent memory leaks that could cause app crashes
 */

import { FEATURES } from '@/config/features';

interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private intervalId?: NodeJS.Timeout;
  private readonly MAX_SNAPSHOTS = 60; // Keep last 60 snapshots (1 minute if checking every second)
  private readonly WARNING_THRESHOLD_MB = 150;
  private readonly CRITICAL_THRESHOLD_MB = 200;

  constructor() {
    if (!FEATURES.enablePerformanceMonitoring) return;
    
    this.startMonitoring();
  }

  /**
   * Check if memory API is available
   */
  private isMemoryAPIAvailable(): boolean {
    return typeof window !== 'undefined' && 'memory' in performance;
  }

  /**
   * Start memory monitoring
   */
  startMonitoring() {
    if (!this.isMemoryAPIAvailable()) {
      console.warn('[MemoryMonitor] Performance.memory API not available (Chrome/Edge only)');
      return;
    }

    this.intervalId = setInterval(() => {
      this.takeSnapshot();
    }, 1000); // Check every second
  }

  /**
   * Take a memory snapshot
   */
  private takeSnapshot() {
    if (!this.isMemoryAPIAvailable()) return;

    const memory = (performance as any).memory;
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }

    // Check for issues
    this.checkForIssues(snapshot);
  }

  /**
   * Check for memory issues
   */
  private checkForIssues(snapshot: MemorySnapshot) {
    const usedMB = snapshot.usedJSHeapSize / 1048576;

    // Warning threshold
    if (usedMB > this.WARNING_THRESHOLD_MB) {
      console.warn(
        `[MemoryMonitor] High memory usage: ${usedMB.toFixed(2)}MB (threshold: ${this.WARNING_THRESHOLD_MB}MB)`
      );
    }

    // Critical threshold
    if (usedMB > this.CRITICAL_THRESHOLD_MB) {
      console.error(
        `[MemoryMonitor] CRITICAL memory usage: ${usedMB.toFixed(2)}MB (threshold: ${this.CRITICAL_THRESHOLD_MB}MB)`
      );
    }

    // Detect memory leaks (consistent growth over time)
    if (this.snapshots.length >= 30) {
      const recentSnapshots = this.snapshots.slice(-30);
      const trend = this.calculateMemoryTrend(recentSnapshots);
      
      if (trend > 0.1) { // Growing more than 100KB per second
        console.warn('[MemoryMonitor] Potential memory leak detected - consistent memory growth');
        this.logMemoryTrend();
      }
    }
  }

  /**
   * Calculate memory growth trend (MB per second)
   */
  private calculateMemoryTrend(snapshots: MemorySnapshot[]): number {
    if (snapshots.length < 2) return 0;

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    
    const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds
    const memoryDiff = (last.usedJSHeapSize - first.usedJSHeapSize) / 1048576; // MB

    return memoryDiff / timeDiff; // MB per second
  }

  /**
   * Get current memory usage
   */
  getCurrentUsage(): number {
    if (!this.isMemoryAPIAvailable()) return 0;
    
    const memory = (performance as any).memory;
    return memory.usedJSHeapSize / 1048576; // MB
  }

  /**
   * Get memory statistics
   */
  getStats() {
    if (this.snapshots.length === 0) {
      return {
        current: 0,
        average: 0,
        peak: 0,
        trend: 0,
      };
    }

    const current = this.snapshots[this.snapshots.length - 1].usedJSHeapSize / 1048576;
    const average = this.snapshots.reduce((sum, s) => sum + s.usedJSHeapSize, 0) / this.snapshots.length / 1048576;
    const peak = Math.max(...this.snapshots.map(s => s.usedJSHeapSize)) / 1048576;
    const trend = this.calculateMemoryTrend(this.snapshots);

    return {
      current: current.toFixed(2),
      average: average.toFixed(2),
      peak: peak.toFixed(2),
      trend: trend.toFixed(4),
    };
  }

  /**
   * Log memory trend to console
   */
  logMemoryTrend() {
    const stats = this.getStats();
    console.group('[MemoryMonitor] Memory Statistics');
    console.log('Current:', stats.current, 'MB');
    console.log('Average:', stats.average, 'MB');
    console.log('Peak:', stats.peak, 'MB');
    console.log('Trend:', stats.trend, 'MB/s');
    console.groupEnd();
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

// Singleton instance
export const memoryMonitor = new MemoryMonitor();

/**
 * Track component mount/unmount for leak detection
 */
export function trackComponentLifecycle(componentName: string) {
  const mountTime = Date.now();
  const initialMemory = memoryMonitor.getCurrentUsage();

  console.log(`[Memory] ${componentName} mounted - ${initialMemory.toFixed(2)}MB`);

  return () => {
    const unmountTime = Date.now();
    const finalMemory = memoryMonitor.getCurrentUsage();
    const duration = unmountTime - mountTime;
    const memoryDiff = finalMemory - initialMemory;

    console.log(
      `[Memory] ${componentName} unmounted after ${(duration / 1000).toFixed(2)}s - ${finalMemory.toFixed(2)}MB (${memoryDiff > 0 ? '+' : ''}${memoryDiff.toFixed(2)}MB)`
    );

    // Warn if memory increased significantly after unmount
    if (memoryDiff > 5) {
      console.warn(
        `[Memory] Potential leak in ${componentName}: Memory increased by ${memoryDiff.toFixed(2)}MB after unmount`
      );
    }
  };
}
