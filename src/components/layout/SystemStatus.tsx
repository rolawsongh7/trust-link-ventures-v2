import React from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemStatusProps {
  isExpanded: boolean;
  isSyncing?: boolean;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ isExpanded, isSyncing = false }) => {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg",
      "bg-gradient-to-r from-emerald-500/10 to-green-500/10",
      "border border-emerald-500/20",
      !isExpanded && "justify-center"
    )}>
      <div className="relative">
        <Activity className="w-4 h-4 text-emerald-400" />
        <span className={cn(
          "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full",
          isSyncing ? "bg-yellow-400 animate-pulse" : "bg-emerald-400",
          "ring-2 ring-slate-900"
        )} />
      </div>
      {isExpanded && (
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-emerald-300">
            {isSyncing ? 'Syncing...' : 'All Systems Operational'}
          </p>
          <p className="text-[10px] text-emerald-400/70">
            Real-time updates active
          </p>
        </div>
      )}
    </div>
  );
};
