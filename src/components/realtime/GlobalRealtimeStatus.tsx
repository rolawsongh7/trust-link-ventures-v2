import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GlobalRealtimeStatusProps {
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  statusText?: string;
}

export const GlobalRealtimeStatus = ({ 
  connectionStatus, 
  statusText 
}: GlobalRealtimeStatusProps) => {
  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <Wifi className="h-3 w-3" />,
          text: 'Live',
          variant: 'default' as const,
          tooltip: 'Real-time updates active',
          className: 'bg-green-500/10 text-green-600 border-green-500/20',
        };
      case 'reconnecting':
        return {
          icon: <Wifi className="h-3 w-3 animate-pulse" />,
          text: 'Reconnecting',
          variant: 'secondary' as const,
          tooltip: 'Attempting to reconnect...',
          className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Offline',
          variant: 'destructive' as const,
          tooltip: 'Real-time updates unavailable. Showing cached data.',
          className: 'bg-red-500/10 text-red-600 border-red-500/20',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={config.variant}
            className={`flex items-center gap-1.5 cursor-help ${config.className}`}
          >
            {config.icon}
            <span className="text-xs font-medium">
              {statusText || config.text}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
