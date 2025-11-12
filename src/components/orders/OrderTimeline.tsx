import React from 'react';
import { Check, Package, Truck, CheckCircle, Clock } from 'lucide-react';

interface OrderTimelineProps {
  currentStatus: string;
  className?: string;
}

const statusStages = [
  { key: 'quote_sent', label: 'Quote Sent', icon: Clock },
  { key: 'order_confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'ready_to_ship', label: 'Ready', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Check },
];

const statusOrder = {
  'quote_sent': 0,
  'order_confirmed': 1,
  'payment_received': 1,
  'ready_to_ship': 2,
  'shipped': 3,
  'in_transit': 3,
  'delivered': 4,
};

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ currentStatus, className = '' }) => {
  const currentStageIndex = statusOrder[currentStatus as keyof typeof statusOrder] ?? -1;

  return (
    <div className={`bg-tl-surface border border-tl-border rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-tl-primary mb-6">Order Progress</h3>
      <div className="flex items-center justify-between">
        {statusStages.map((stage, idx) => {
          const isComplete = idx <= currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          const Icon = stage.icon;
          
          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isComplete
                      ? 'bg-tl-gradient text-white shadow-md'
                      : 'bg-tl-border text-tl-muted'
                  } ${isCurrent ? 'ring-4 ring-tl-accent/30' : ''}`}
                >
                  {isComplete && idx < currentStageIndex ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    isComplete ? 'text-tl-accent' : 'text-tl-muted'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {idx < statusStages.length - 1 && (
                <div className="flex-1 h-1 mx-2 mb-6 relative">
                  <div className="absolute inset-0 bg-tl-border rounded-full" />
                  <div
                    className={`absolute inset-0 rounded-full transition-all duration-500 ${
                      idx < currentStageIndex ? 'bg-tl-gradient' : 'bg-transparent'
                    }`}
                    style={{
                      width: idx < currentStageIndex ? '100%' : '0%',
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
