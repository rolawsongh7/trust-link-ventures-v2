import { cn } from "@/lib/utils";

interface StatusPulseProps {
  status: 'healthy' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

export const StatusPulse = ({ status, size = 'md' }: StatusPulseProps) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  const colorClasses = {
    healthy: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  };

  return (
    <span className="relative flex">
      <span className={cn(
        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
        colorClasses[status]
      )} />
      <span className={cn(
        "relative inline-flex rounded-full",
        sizeClasses[size],
        colorClasses[status]
      )} />
    </span>
  );
};
