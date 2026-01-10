import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface OrderStatusProgressProps {
  currentStatus: string;
  size?: 'sm' | 'md';
}

const ORDER_STAGES = [
  { key: 'order_confirmed', label: 'Confirmed' },
  { key: 'pending_payment', label: 'Payment' },
  { key: 'payment_received', label: 'Received' },
  { key: 'processing', label: 'Processing' },
  { key: 'ready_to_ship', label: 'Ready' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

const CANCELLED_STAGES = ['cancelled', 'delivery_failed'];

export const OrderStatusProgress: React.FC<OrderStatusProgressProps> = ({ 
  currentStatus,
  size = 'sm'
}) => {
  if (CANCELLED_STAGES.includes(currentStatus)) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-destructive" />
        <span className="text-xs font-medium text-destructive capitalize">
          {currentStatus.replace(/_/g, ' ')}
        </span>
      </div>
    );
  }

  const currentIndex = ORDER_STAGES.findIndex(s => s.key === currentStatus);
  const stepsToShow = size === 'sm' ? 4 : ORDER_STAGES.length;
  
  // For small size, show relevant stages around current
  let displayStages = ORDER_STAGES;
  if (size === 'sm' && ORDER_STAGES.length > stepsToShow) {
    const start = Math.max(0, Math.min(currentIndex - 1, ORDER_STAGES.length - stepsToShow));
    displayStages = ORDER_STAGES.slice(start, start + stepsToShow);
  }

  return (
    <div className="flex items-center gap-0.5">
      {displayStages.map((stage, index) => {
        const stageIndex = ORDER_STAGES.findIndex(s => s.key === stage.key);
        const isCompleted = stageIndex < currentIndex;
        const isCurrent = stageIndex === currentIndex;
        const isUpcoming = stageIndex > currentIndex;
        
        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "rounded-full flex items-center justify-center transition-colors",
                  size === 'sm' ? 'w-2 h-2' : 'w-3 h-3',
                  isCompleted && 'bg-green-500',
                  isCurrent && 'bg-primary ring-2 ring-primary/20',
                  isUpcoming && 'bg-muted-foreground/30'
                )}
              >
                {isCompleted && size === 'md' && (
                  <Check className="h-2 w-2 text-white" />
                )}
              </div>
            </div>
            {index < displayStages.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 min-w-[8px] max-w-[16px] transition-colors",
                  stageIndex < currentIndex ? 'bg-green-500' : 'bg-muted-foreground/20'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
