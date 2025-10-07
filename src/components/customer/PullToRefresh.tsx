import React from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { RefreshCw, Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const { isPulling, isRefreshing, pullProgress, handlers } = usePullToRefresh({ onRefresh });

  return (
    <div {...handlers} className="relative">
      {/* Pull Indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 pointer-events-none"
        style={{
          height: `${Math.min(pullProgress, 100)}px`,
          opacity: pullProgress / 100,
        }}
      >
        <div className="flex items-center gap-2 text-primary">
          {isRefreshing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Refreshing...</span>
            </>
          ) : (
            <>
              <RefreshCw
                className="h-5 w-5 transition-transform"
                style={{ transform: `rotate(${pullProgress * 3.6}deg)` }}
              />
              <span className="text-sm font-medium">
                {pullProgress >= 100 ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: isRefreshing || isPulling ? `translateY(${Math.min(pullProgress, 100)}px)` : 'translateY(0)',
        }}
      >
        {children}
      </div>
    </div>
  );
};
