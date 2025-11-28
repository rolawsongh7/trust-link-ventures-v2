import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpModal } from './HelpModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export const HelpButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  // Only show on desktop
  if (isMobile) {
    return null;
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setOpen(true)}
              size="icon"
              className={cn(
                "fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-50",
                "bg-primary hover:bg-primary/90 text-primary-foreground",
                "transition-all duration-300 hover:scale-110",
                "animate-in fade-in slide-in-from-bottom-4"
              )}
              aria-label="Open help menu"
            >
              <HelpCircle className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-sm">
            <p>Need help?</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <HelpModal open={open} onOpenChange={setOpen} />
    </>
  );
};
