import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  CreditCard, 
  Clock, 
  RefreshCw, 
  User, 
  X, 
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Sparkles
} from 'lucide-react';
import { DashboardAlert, AlertPriority } from '@/hooks/useDashboardAlerts';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardAlertsProps {
  alerts: DashboardAlert[];
  loading: boolean;
  onDismiss: (alertId: string) => void;
}

const iconMap: Record<string, React.ElementType> = {
  'map-pin': MapPin,
  'credit-card': CreditCard,
  'clock': Clock,
  'refresh-cw': RefreshCw,
  'user': User,
  'file-text': FileText
};

const priorityStyles: Record<AlertPriority, { 
  bg: string; 
  border: string; 
  icon: string;
  badge: string;
}> = {
  high: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-l-red-500',
    icon: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
  },
  medium: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-l-amber-500',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
  },
  low: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-l-blue-500',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
  }
};

function AlertCard({ 
  alert, 
  onDismiss 
}: { 
  alert: DashboardAlert; 
  onDismiss: () => void;
}) {
  const navigate = useNavigate();
  const Icon = iconMap[alert.icon || 'alert-circle'] || AlertCircle;
  const styles = priorityStyles[alert.priority];

  const handleCtaClick = () => {
    if (alert.ctaAction) {
      alert.ctaAction();
    }
    navigate(alert.ctaRoute);
  };

  return (
    <Card className={cn(
      'border-l-4 shadow-sm hover:shadow-md transition-all duration-200',
      styles.bg,
      styles.border
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            alert.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30' : 
            alert.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30' : 
            'bg-blue-100 dark:bg-blue-900/30'
          )}>
            <Icon className={cn('w-5 h-5', styles.icon)} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-tl-text text-sm sm:text-base">
                  {alert.title}
                </h4>
                <p className="text-tl-muted text-xs sm:text-sm mt-0.5">
                  {alert.description}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDismiss();
                }}
                className="text-tl-muted hover:text-tl-text transition-colors p-1 -mr-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <Button
              onClick={handleCtaClick}
              size="sm"
              className="mt-3 bg-tl-gradient hover:opacity-95 text-white min-h-[36px]"
            >
              {alert.ctaLabel}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map(i => (
        <Card key={i} className="border-l-4 border-l-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-24 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AllClearState() {
  return (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-tl-text">You're all set!</h3>
            <p className="text-sm text-tl-muted">
              No pending actions. Browse products or reorder anytime.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="hidden sm:flex">
            <Link to="/portal/catalog">
              <Sparkles className="w-4 h-4 mr-2" />
              Browse
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardAlerts({ alerts, loading, onDismiss }: DashboardAlertsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold text-tl-primary flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          What needs your attention
        </h2>
        <AlertsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg sm:text-xl font-semibold text-tl-primary flex items-center gap-2">
        {alerts.length > 0 ? (
          <>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            What needs your attention
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            All caught up
          </>
        )}
      </h2>
      
      {alerts.length === 0 ? (
        <AllClearState />
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <AlertCard 
              key={alert.id} 
              alert={alert} 
              onDismiss={() => onDismiss(alert.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
