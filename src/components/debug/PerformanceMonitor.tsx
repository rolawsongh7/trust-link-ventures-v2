/**
 * Visual Performance Dashboard (Development Only)
 * Displays real-time performance metrics
 */

import { useEffect, useState } from 'react';
import { performanceMonitor, PerformanceMetrics } from '@/lib/performanceMonitor';
import { FEATURES } from '@/config/features';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gauge, MemoryStick, Timer, Zap } from 'lucide-react';

export const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(performanceMonitor.getMetrics());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!FEATURES.enableDebugMode) return;

    // Subscribe to metric updates
    const unsubscribe = performanceMonitor.subscribe(setMetrics);

    // Add keyboard shortcut to toggle (Ctrl/Cmd + Shift + P)
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  if (!FEATURES.enableDebugMode || !isVisible) return null;

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-500';
    if (fps >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMemoryColor = (memory: number) => {
    if (memory < 100) return 'text-green-500';
    if (memory < 150) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getLoadTimeColor = (time: number) => {
    if (time < 2000) return 'text-green-500';
    if (time < 3000) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="bg-background/95 backdrop-blur-sm shadow-2xl border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Performance Monitor
            </span>
            <button
              onClick={() => setIsVisible(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* FPS */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">FPS</span>
            </div>
            <span className={`text-lg font-bold ${getFPSColor(metrics.fps)}`}>
              {metrics.fps}
            </span>
          </div>

          {/* Memory */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Memory</span>
            </div>
            <span className={`text-lg font-bold ${getMemoryColor(metrics.memory)}`}>
              {metrics.memory}MB
            </span>
          </div>

          {/* Load Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Load Time</span>
            </div>
            <span className={`text-lg font-bold ${getLoadTimeColor(metrics.loadTime)}`}>
              {metrics.loadTime.toFixed(0)}ms
            </span>
          </div>

          {/* Status */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className={`h-2 w-2 rounded-full ${metrics.fps >= 50 && metrics.memory < 150 ? 'bg-green-500' : 'bg-yellow-500'}`} />
              {metrics.fps >= 50 && metrics.memory < 150 ? (
                <span>Meeting performance targets</span>
              ) : (
                <span>Performance issues detected</span>
              )}
            </div>
          </div>

          {/* Hint */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Press Ctrl/Cmd + Shift + P to toggle
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
