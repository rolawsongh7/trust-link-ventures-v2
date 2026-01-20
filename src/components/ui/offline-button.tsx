import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OfflineButtonProps extends ButtonProps {
  requiresOnline?: boolean;
  offlineText?: string;
  showOfflineIcon?: boolean;
}

export const OfflineButton = React.forwardRef<HTMLButtonElement, OfflineButtonProps>(
  (
    {
      children,
      requiresOnline = true,
      offlineText = 'Requires Internet',
      showOfflineIcon = true,
      disabled,
      ...props
    },
    ref
  ) => {
    const { isOnline } = useNetworkStatus();
    const isDisabledDueToOffline = requiresOnline && !isOnline;
    const isDisabled = disabled || isDisabledDueToOffline;

    if (isDisabledDueToOffline) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button ref={ref} {...props} disabled className="pointer-events-none">
                  {showOfflineIcon && <WifiOff className="mr-2 h-4 w-4" />}
                  {offlineText}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>You are offline. This action requires an internet connection.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Button ref={ref} {...props} disabled={isDisabled}>
        {children}
      </Button>
    );
  }
);

OfflineButton.displayName = 'OfflineButton';
