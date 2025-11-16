import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon, ChevronRight } from 'lucide-react';

interface DashboardCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  color?: string;
  badge?: number;
  delay?: number;
  borderColor?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  icon: Icon,
  title,
  description,
  to,
  color = 'from-[#0077B6] to-[#003366]',
  badge,
  delay = 0,
  borderColor,
}) => {
  return (
    <Link
      to={to}
      className={`group relative rounded-2xl p-4 sm:p-5 
                 bg-white/90 dark:bg-slate-900/80 
                 border border-slate-200/60 dark:border-slate-800 
                 shadow-sm hover:shadow-md 
                 transition-all duration-200 
                 hover:translate-y-[-2px] active:translate-y-0 active:scale-[0.98]
                 motion-reduce:transition-none motion-reduce:hover:translate-y-0
                 focus-maritime
                 min-h-[120px] sm:min-h-[130px]
                 flex flex-col
                 stagger-animation
                 ${borderColor ? `border-l-4 ${borderColor}` : ''}`}
      style={{ animationDelay: `${delay}ms` }}
      aria-label={`${title}: ${description}`}
    >
      {/* Icon Chip */}
      <div className={`w-10 h-10 sm:w-11 sm:h-11 
                       rounded-xl 
                       bg-gradient-to-br ${color}
                       flex items-center justify-center
                       mb-3 sm:mb-4
                       transition-transform duration-200
                       group-hover:scale-110
                       motion-reduce:group-hover:scale-100`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>

      {/* Badge */}
      {badge !== undefined && badge > 0 && (
        <div className="absolute top-3 right-3
                        w-6 h-6 sm:w-7 sm:h-7
                        rounded-full
                        bg-gradient-to-br from-rose-500 to-rose-600
                        text-white
                        text-xs sm:text-sm font-bold
                        flex items-center justify-center
                        shadow-sm">
          {badge > 99 ? '99+' : badge}
        </div>
      )}

      {/* Content */}
      <div className="flex-1">
        <h3 className="text-sm sm:text-[15px] 
                       font-semibold 
                       text-[#0f2f57] dark:text-white
                       mb-1">
          {title}
        </h3>
        <p className="text-xs sm:text-sm 
                      text-slate-500 dark:text-slate-400 
                      line-clamp-2">
          {description}
        </p>
      </div>

      {/* Chevron Arrow */}
      <ChevronRight 
        className="absolute bottom-3 right-3
                   w-4 h-4 sm:w-5 sm:h-5
                   text-[#0077B6]/70 dark:text-[#2AA6FF]/70
                   group-hover:text-[#0077B6] dark:group-hover:text-[#2AA6FF]
                   group-hover:translate-x-1
                   transition-all duration-200
                   motion-reduce:group-hover:translate-x-0" 
      />
    </Link>
  );
};
