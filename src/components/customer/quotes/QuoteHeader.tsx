import React from 'react';
import { FileText, Clock, CheckCircle, FileCheck } from 'lucide-react';

interface QuoteHeaderProps {
  totalQuotes: number;
  pendingCount: number;
  quotedCount: number;
  approvedCount: number;
}

const StatPill: React.FC<{ 
  label: string; 
  count: number; 
  color: 'warning' | 'info' | 'success';
  icon: React.ComponentType<{ className?: string }>;
}> = ({ label, count, color, icon: Icon }) => {
  const colorClasses = {
    warning: 'bg-white/20 border-white/30 text-white',
    info: 'bg-white/20 border-white/30 text-white',
    success: 'bg-white/20 border-white/30 text-white'
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-sm ${colorClasses[color]}`}>
      <Icon className="h-4 w-4" />
      <div>
        <div className="text-xs opacity-90">{label}</div>
        <div className="text-lg font-semibold">{count}</div>
      </div>
    </div>
  );
};

export const QuoteHeader: React.FC<QuoteHeaderProps> = ({ 
  totalQuotes, 
  pendingCount, 
  quotedCount, 
  approvedCount 
}) => {
  return (
    <div className="relative overflow-hidden rounded-t-xl bg-gradient-to-r from-trustlink-navy to-trustlink-maritime p-6 text-white shadow-md">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-1">My Quote Requests</h1>
            <p className="text-sm md:text-base text-white/90">
              Track and manage all your quotes in one place
            </p>
          </div>
          
          {/* Total count badge */}
          <div className="rounded-full bg-trustlink-gold px-4 py-2 shadow-md">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-white" />
              <span className="text-white font-semibold text-lg">{totalQuotes}</span>
            </div>
          </div>
        </div>
        
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <StatPill label="Pending" count={pendingCount} color="warning" icon={Clock} />
          <StatPill label="Quoted" count={quotedCount} color="info" icon={FileCheck} />
          <StatPill label="Accepted" count={approvedCount} color="success" icon={CheckCircle} />
        </div>
      </div>
    </div>
  );
};
