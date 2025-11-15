import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const OrderCardSkeleton = () => {
  return (
    <Card className="w-full border-l-4 border-l-gray-300 dark:border-l-gray-700">
      <CardContent className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex items-center gap-2 ml-3">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Amount Box */}
          <div className="col-span-2 bg-muted/30 rounded-lg p-4">
            <Skeleton className="h-3 w-24 mb-2" />
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>

          {/* Items */}
          <div className="bg-muted/30 rounded-lg p-3">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-5 w-12" />
          </div>

          {/* Created */}
          <div className="bg-muted/30 rounded-lg p-3">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-5 w-24" />
          </div>

          {/* Origin */}
          <div className="col-span-2">
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
