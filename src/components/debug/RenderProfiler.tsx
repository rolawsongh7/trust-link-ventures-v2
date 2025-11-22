/**
 * React Profiler Component
 * Tracks component render performance in development
 */

import { Profiler, ProfilerOnRenderCallback } from 'react';
import { FEATURES } from '@/config/features';

interface RenderProfilerProps {
  id: string;
  children: React.ReactNode;
}

const onRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  // Only log in development
  if (!FEATURES.enableDebugMode) return;

  // Warn if render is slow (>16ms = longer than one frame at 60fps)
  if (actualDuration > 16) {
    console.warn(
      `[RenderProfiler] Slow render detected: ${id}`,
      {
        phase, // "mount" or "update"
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        baseDuration: `${baseDuration.toFixed(2)}ms`,
        efficiency: `${((1 - actualDuration / baseDuration) * 100).toFixed(0)}%`,
      }
    );
  }

  // Log very slow renders as errors
  if (actualDuration > 50) {
    console.error(
      `[RenderProfiler] CRITICAL slow render: ${id}`,
      {
        phase,
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        suggestion: 'Consider memoization or code splitting',
      }
    );
  }
};

/**
 * Wrap components with this profiler to track render performance
 */
export const RenderProfiler = ({ id, children }: RenderProfilerProps) => {
  // Only enable in development
  if (!FEATURES.enableDebugMode) {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
};

/**
 * Higher-order component to profile a component
 */
export function withProfiler<P extends object>(
  Component: React.ComponentType<P>,
  profileId: string
) {
  return (props: P) => (
    <RenderProfiler id={profileId}>
      <Component {...props} />
    </RenderProfiler>
  );
}
