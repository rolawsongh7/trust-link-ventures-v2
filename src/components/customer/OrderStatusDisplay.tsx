// Step 6: Order Status Display Component - Visual timeline for order progress
import { CheckCircle2, Clock, Package, Truck, MapPin, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderStatusDisplayProps {
  status: string;
  createdAt: string;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  estimatedDeliveryDate?: string | null;
  className?: string;
}

export const OrderStatusDisplay = ({
  status,
  createdAt,
  shippedAt,
  deliveredAt,
  estimatedDeliveryDate,
  className
}: OrderStatusDisplayProps) => {
  const steps = [
    {
      key: 'confirmed',
      label: 'Order Confirmed',
      icon: CheckCircle2,
      isCompleted: ['order_confirmed', 'pending_payment', 'payment_received', 'processing', 'ready_to_ship', 'shipped', 'delivered'].includes(status)
    },
    {
      key: 'processing',
      label: 'Processing',
      icon: Package,
      isCompleted: ['processing', 'ready_to_ship', 'shipped', 'delivered'].includes(status)
    },
    {
      key: 'shipped',
      label: 'Shipped',
      icon: Truck,
      isCompleted: ['shipped', 'delivered'].includes(status)
    },
    {
      key: 'delivered',
      label: 'Delivered',
      icon: MapPin,
      isCompleted: status === 'delivered'
    }
  ];

  const isCancelled = status === 'cancelled';
  const isFailed = status === 'delivery_failed';

  if (isCancelled || isFailed) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8", className)}>
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-destructive">
          {isCancelled ? 'Order Cancelled' : 'Delivery Failed'}
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          {isCancelled ? 'This order has been cancelled' : 'Delivery attempt failed. Will retry soon.'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* Progress line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-border" style={{ top: '24px' }} />
        <div 
          className="absolute top-6 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ 
            top: '24px',
            width: `${(steps.filter(s => s.isCompleted).length / steps.length) * 100}%`
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.isCompleted;
            const isCurrent = index === steps.findIndex(s => !s.isCompleted);

            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative z-10",
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    isCurrent && !isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  {isActive ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </div>
                <span 
                  className={cn(
                    "text-xs md:text-sm mt-2 text-center transition-colors",
                    isActive ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-8 space-y-2 text-sm text-muted-foreground">
        {createdAt && (
          <div className="flex items-center justify-between">
            <span>Order Placed:</span>
            <span className="font-medium text-foreground">
              {new Date(createdAt).toLocaleDateString()}
            </span>
          </div>
        )}
        {shippedAt && (
          <div className="flex items-center justify-between">
            <span>Shipped:</span>
            <span className="font-medium text-foreground">
              {new Date(shippedAt).toLocaleDateString()}
            </span>
          </div>
        )}
        {deliveredAt && (
          <div className="flex items-center justify-between">
            <span>Delivered:</span>
            <span className="font-medium text-foreground">
              {new Date(deliveredAt).toLocaleDateString()}
            </span>
          </div>
        )}
        {estimatedDeliveryDate && !deliveredAt && (
          <div className="flex items-center justify-between">
            <span>Estimated Delivery:</span>
            <span className="font-medium text-foreground">
              {new Date(estimatedDeliveryDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
