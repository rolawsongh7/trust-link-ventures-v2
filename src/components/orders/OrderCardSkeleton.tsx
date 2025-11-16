import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const OrderCardSkeleton = () => {
  return (
    <Card className="overflow-hidden border-l-4 border-l-muted">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between mb-4">
          {/* Order number skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>

          {/* Status badge skeleton */}
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2 p-3 rounded-lg bg-muted/30">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-full" />
            </div>
          ))}
        </div>

        {/* Actions skeleton */}
        <div className="flex gap-2 mt-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </CardContent>
    </Card>
  );
};

export function OrderCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {[...Array(count)].map((_, i) => (
        <OrderCardSkeleton key={i} />
      ))}
    </div>
  );
}
