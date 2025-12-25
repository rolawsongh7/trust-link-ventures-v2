import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Package, FileText, ShoppingCart, Clock } from 'lucide-react';
import { OrderStatusBadge } from './OrderStatusBadge';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'order' | 'quote' | 'cart';
  title: string;
  status: string;
  timestamp: string;
  link?: string;
}

interface RecentActivityListProps {
  activities: Activity[];
  loading?: boolean;
  maxItems?: number;
}

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'order':
      return Package;
    case 'quote':
      return FileText;
    case 'cart':
      return ShoppingCart;
    default:
      return Clock;
  }
};

const ActivitySkeleton: React.FC = () => (
  <div className="rounded-2xl p-4 sm:p-5 
                  bg-white/90 dark:bg-slate-900/80 
                  border border-slate-200/60 dark:border-slate-800 
                  animate-pulse">
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32 sm:w-40" />
        <Skeleton className="h-3 w-24 sm:w-32" />
      </div>
      <Skeleton className="h-6 w-16 sm:w-20 rounded-full" />
    </div>
  </div>
);

export const RecentActivityList: React.FC<RecentActivityListProps> = ({
  activities,
  loading = false,
  maxItems = 6,
}) => {
  const displayActivities = activities.slice(0, maxItems);

  if (loading) {
    return (
      <div className="grid 
                      grid-cols-1 gap-3 
                      md:grid md:grid-cols-2 md:gap-4 
                      lg:grid lg:grid-cols-3 lg:gap-5">
        {[...Array(maxItems)].map((_, i) => (
          <ActivitySkeleton key={i} />
        ))}
      </div>
    );
  }

  if (displayActivities.length === 0) {
    return (
      <div className="rounded-2xl p-8 sm:p-12 
                      bg-white/90 dark:bg-slate-900/80 
                      border border-slate-200/60 dark:border-slate-800 
                      text-center">
        <Clock className="w-12 h-12 sm:w-16 sm:h-16 
                         mx-auto mb-4
                         text-slate-300 dark:text-slate-700" />
        <p className="text-sm sm:text-base 
                      text-slate-500 dark:text-slate-400 
                      font-medium">
          No recent activity
        </p>
        <p className="text-xs sm:text-sm 
                      text-slate-400 dark:text-slate-500 
                      mt-1">
          Your orders and quotes will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="grid 
                    grid-cols-1 gap-3 
                    md:grid md:grid-cols-2 md:gap-4 
                    lg:grid lg:grid-cols-3 lg:gap-5">
      {displayActivities.map((activity, index) => {
        const Icon = getActivityIcon(activity.type);
        const cardContent = (
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Icon */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 
                            rounded-xl 
                            bg-gradient-to-br from-[#0077B6]/10 to-[#003366]/5
                            dark:from-[#2AA6FF]/10 dark:to-[#1E40AF]/5
                            flex items-center justify-center
                            flex-shrink-0">
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 
                              text-[#0077B6] dark:text-[#2AA6FF]" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-sm sm:text-base 
                               font-semibold 
                               text-[#0f2f57] dark:text-white
                               line-clamp-1">
                  {activity.title}
                </h4>
                {activity.link && (
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 
                                           text-slate-400 dark:text-slate-600
                                           group-hover:text-[#0077B6] dark:group-hover:text-[#2AA6FF]
                                           group-hover:translate-x-1
                                           transition-all duration-200
                                           motion-reduce:group-hover:translate-x-0
                                           flex-shrink-0" />
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {activity.type === 'order' ? (
                  <OrderStatusBadge status={activity.status} variant="compact" />
                ) : (
                  <QuoteStatusBadge status={activity.status} variant="compact" showTooltip={false} />
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        );

        return activity.link ? (
          <Link
            key={activity.id}
            to={activity.link}
            className="block rounded-2xl p-4 sm:p-5 
                       bg-white/90 dark:bg-slate-900/80 
                       border border-slate-200/60 dark:border-slate-800 
                       shadow-sm hover:shadow-md 
                       transition-all duration-200 
                       hover:translate-y-[-2px] active:translate-y-0 
                       motion-reduce:transition-none motion-reduce:hover:translate-y-0 
                       focus-maritime 
                       group 
                       stagger-animation"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {cardContent}
          </Link>
        ) : (
          <div
            key={activity.id}
            className="rounded-2xl p-4 sm:p-5 
                       bg-white/90 dark:bg-slate-900/80 
                       border border-slate-200/60 dark:border-slate-800 
                       shadow-sm 
                       stagger-animation"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {cardContent}
          </div>
        );
      })}
    </div>
  );
};
