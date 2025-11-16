import { motion } from 'framer-motion';
import { 
  Clock, 
  CreditCard, 
  CheckCircle2, 
  Cog, 
  Package, 
  Truck, 
  CheckCheck, 
  XCircle, 
  PauseCircle,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { badgePulse, spin } from '@/lib/animations';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'soft';
  showIcon?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  className?: string;
}

const statusConfig: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  color: string;
  description: string;
  pulse?: boolean;
  spinning?: boolean;
}> = {
  'order_confirmed': {
    label: 'Pending',
    icon: Clock,
    gradient: 'from-amber-500 to-orange-500',
    color: 'hsl(38, 92%, 50%)',
    description: 'Order confirmed, awaiting payment',
    pulse: true,
  },
  'pending_payment': {
    label: 'Payment Pending',
    icon: CreditCard,
    gradient: 'from-yellow-500 to-amber-500',
    color: 'hsl(45, 93%, 47%)',
    description: 'Waiting for payment confirmation',
    pulse: true,
  },
  'payment_received': {
    label: 'Payment Received',
    icon: CheckCircle2,
    gradient: 'from-sky-500 to-blue-600',
    color: 'hsl(199, 89%, 48%)',
    description: 'Payment confirmed, processing order',
  },
  'processing': {
    label: 'Processing',
    icon: Loader2,
    gradient: 'from-blue-600 to-indigo-600',
    color: 'hsl(217, 91%, 60%)',
    description: 'Order is being processed',
    spinning: true,
  },
  'ready_to_ship': {
    label: 'Ready to Ship',
    icon: Package,
    gradient: 'from-purple-500 to-purple-600',
    color: 'hsl(271, 91%, 65%)',
    description: 'Order is ready for shipment',
  },
  'shipped': {
    label: 'Shipped',
    icon: Truck,
    gradient: 'from-indigo-600 to-purple-600',
    color: 'hsl(243, 75%, 59%)',
    description: 'Order has been shipped',
  },
  'delivered': {
    label: 'Delivered',
    icon: CheckCheck,
    gradient: 'from-green-600 to-emerald-600',
    color: 'hsl(142, 76%, 36%)',
    description: 'Order successfully delivered',
  },
  'cancelled': {
    label: 'Cancelled',
    icon: XCircle,
    gradient: 'from-red-500 to-red-600',
    color: 'hsl(0, 84%, 60%)',
    description: 'Order has been cancelled',
  },
  'on_hold': {
    label: 'On Hold',
    icon: PauseCircle,
    gradient: 'from-slate-500 to-slate-600',
    color: 'hsl(215, 16%, 47%)',
    description: 'Order is temporarily on hold',
  },
};

export function StatusBadge({
  status,
  size = 'md',
  variant = 'solid',
  showIcon = true,
  showTooltip = true,
  animated = true,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig['order_confirmed'];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  const getBadgeClasses = () => {
    const base = cn(
      'inline-flex items-center justify-center font-medium rounded-full',
      'transition-all duration-300 ease-out',
      sizeClasses[size],
      className
    );

    if (variant === 'solid') {
      return cn(
        base,
        `bg-gradient-to-r ${config.gradient} text-white shadow-md`,
        'hover:shadow-lg hover:scale-105'
      );
    }

    if (variant === 'outline') {
      return cn(
        base,
        'border-2 bg-background/50 backdrop-blur-sm',
        'hover:bg-background/80'
      );
    }

    // soft variant
    return cn(
      base,
      'bg-background/70 backdrop-blur-sm',
      'hover:bg-background/90'
    );
  };

  const badgeContent = (
    <motion.div
      variants={config.pulse && animated ? badgePulse : undefined}
      initial="initial"
      animate={config.pulse && animated ? "animate" : undefined}
      className={getBadgeClasses()}
      style={{
        borderColor: variant !== 'solid' ? config.color : undefined,
        color: variant !== 'solid' ? config.color : undefined,
      }}
    >
      {showIcon && (
        <motion.div
          variants={config.spinning ? spin : undefined}
          animate={config.spinning ? "animate" : undefined}
        >
          <Icon className={iconSizes[size]} />
        </motion.div>
      )}
      <span>{config.label}</span>
    </motion.div>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent 
          side="top"
          className="glass-modal border-border/50"
        >
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
