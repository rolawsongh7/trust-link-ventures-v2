import React from 'react';

interface QuoteSkeletonLoaderProps {
  viewMode: 'table' | 'cards';
}

export const QuoteSkeletonLoader: React.FC<QuoteSkeletonLoaderProps> = ({ viewMode }) => {
  if (viewMode === 'cards') {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl bg-white dark:bg-slate-900 shadow-md border border-[hsl(var(--tl-border))] p-4 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
              <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
            
            <div className="space-y-3">
              <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-8 w-full rounded bg-slate-200 dark:bg-slate-700 mt-4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[hsl(var(--tl-border))] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-t border-[hsl(var(--tl-border))]">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
