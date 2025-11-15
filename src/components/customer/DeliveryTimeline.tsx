import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Order {
  status: string;
  created_at: string;
  payment_confirmed_at?: string;
  processing_started_at?: string;
  ready_to_ship_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  estimated_delivery_date?: string;
}

interface Props {
  order: Order;
}

export const DeliveryTimeline = ({ order }: Props) => {
  const stages = [
    {
      key: 'order_confirmed',
      label: 'Order Placed',
      timestamp: order.created_at,
      description: 'Your order has been confirmed'
    },
    {
      key: 'payment_confirmed',
      label: 'Payment Confirmed',
      timestamp: order.payment_confirmed_at,
      description: 'Payment received and verified'
    },
    {
      key: 'processing',
      label: 'Processing',
      timestamp: order.processing_started_at,
      description: 'Order is being prepared'
    },
    {
      key: 'ready_to_ship',
      label: 'Ready to Ship',
      timestamp: order.ready_to_ship_at,
      description: 'Order is packaged and ready'
    },
    {
      key: 'shipped',
      label: 'Shipped',
      timestamp: order.shipped_at,
      description: 'Order is in transit'
    },
    {
      key: 'delivered',
      label: 'Delivered',
      timestamp: order.delivered_at || order.estimated_delivery_date,
      description: order.delivered_at ? 'Order delivered successfully' : 'Estimated delivery',
      isEstimate: !order.delivered_at && order.status !== 'delivered'
    }
  ];

  const currentStageIndex = stages.findIndex(stage => 
    stage.key === order.status || 
    (stage.key === 'out_for_delivery' && order.status === 'out_for_delivery')
  );

  const getStageStatus = (index: number) => {
    if (index < currentStageIndex) return 'completed';
    if (index === currentStageIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-lg">Delivery Timeline</h3>
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-6">
          {stages.map((stage, index) => {
            const status = getStageStatus(index);
            const hasTimestamp = stage.timestamp && !stage.isEstimate;

            return (
              <div key={stage.key} className="relative flex gap-4">
                {/* Icon */}
                <div className={`
                  relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2
                  ${status === 'completed' 
                    ? 'bg-emerald-500 border-emerald-500' 
                    : status === 'current'
                    ? 'bg-primary border-primary animate-pulse'
                    : 'bg-background border-border'
                  }
                `}>
                  {status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : status === 'current' ? (
                    <Circle className="h-4 w-4 text-white fill-white" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`
                      font-semibold
                      ${status === 'completed' || status === 'current'
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                      }
                    `}>
                      {stage.label}
                    </h4>
                    {hasTimestamp && (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(stage.timestamp), 'MMM dd, h:mm a')}
                      </span>
                    )}
                    {stage.isEstimate && stage.timestamp && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Est. {format(new Date(stage.timestamp), 'MMM dd')}
                      </span>
                    )}
                  </div>
                  <p className={`
                    text-sm
                    ${status === 'completed' || status === 'current'
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground/60'
                    }
                  `}>
                    {stage.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
