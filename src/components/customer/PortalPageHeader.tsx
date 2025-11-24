import React from 'react';

interface StatPillData {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface PortalPageHeaderProps {
  title: string;
  subtitle: string;
  totalCount: number;
  totalIcon: React.ComponentType<{ className?: string }>;
  stats: StatPillData[];
  patternId?: string;
  variant?: 'customer' | 'admin';
}

const StatPill: React.FC<StatPillData> = ({ label, count, icon: Icon }) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/30 bg-white/20 backdrop-blur-sm text-white min-w-0">
      <Icon className="h-4 w-4 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-xs opacity-90 truncate">{label}</div>
        <div className="text-base sm:text-lg font-semibold">{count}</div>
      </div>
    </div>
  );
};

export const PortalPageHeader: React.FC<PortalPageHeaderProps> = ({ 
  title,
  subtitle,
  totalCount,
  totalIcon: TotalIcon,
  stats,
  patternId = 'portal-grid',
  variant = 'customer'
}) => {
  const gradientClasses = variant === 'admin' 
    ? 'bg-gradient-to-r from-primary to-accent' 
    : 'bg-gradient-to-r from-trustlink-navy to-trustlink-maritime';
  
  return (
    <div className={`relative overflow-hidden rounded-t-xl ${gradientClasses} p-4 sm:p-6 text-white shadow-md`}>
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={patternId} width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4 gap-4 flex-col sm:flex-row">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-1">{title}</h1>
            <p className="text-sm md:text-base text-white/90">
              {subtitle}
            </p>
          </div>
          
          {/* Total count badge */}
          <div className="rounded-full bg-trustlink-gold px-4 py-2 shadow-md">
            <div className="flex items-center gap-2">
              <TotalIcon className="h-5 w-5 text-white" />
              <span className="text-white font-semibold text-lg">{totalCount}</span>
            </div>
          </div>
        </div>
        
        {/* Quick stats */}
        {stats.length > 0 && (
          <div className="grid gap-3 mt-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stats.map((stat, index) => (
              <StatPill key={index} {...stat} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
