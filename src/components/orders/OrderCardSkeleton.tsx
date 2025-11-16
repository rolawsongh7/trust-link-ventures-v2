import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

export const OrderCardSkeleton = () => {
  return (
    <Card className="overflow-hidden border-l-4 border-l-muted">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between mb-4">
          {/* Order number skeleton */}
          <div className="space-y-2">
            <motion.div 
              className="h-6 w-32 bg-muted rounded shimmer"
              animate={{
                backgroundPosition: ['200% 0', '-200% 0'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
            <motion.div 
              className="h-4 w-24 bg-muted rounded shimmer"
              animate={{
                backgroundPosition: ['200% 0', '-200% 0'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
                delay: 0.1,
              }}
            />
          </div>

          {/* Status badge skeleton */}
          <motion.div 
            className="h-8 w-28 bg-muted rounded-full shimmer"
            animate={{
              backgroundPosition: ['200% 0', '-200% 0'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
              delay: 0.2,
            }}
          />
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2 p-3 rounded-lg bg-muted/30">
              <motion.div 
                className="h-4 w-20 bg-muted rounded shimmer"
                animate={{
                  backgroundPosition: ['200% 0', '-200% 0'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                  delay: 0.1 * i,
                }}
              />
              <motion.div 
                className="h-6 w-full bg-muted rounded shimmer"
                animate={{
                  backgroundPosition: ['200% 0', '-200% 0'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                  delay: 0.1 * i + 0.1,
                }}
              />
            </div>
          ))}
        </div>

        {/* Actions skeleton */}
        <div className="flex gap-2 mt-6">
          {[...Array(2)].map((_, i) => (
            <motion.div 
              key={i}
              className="h-10 flex-1 bg-muted rounded shimmer"
              animate={{
                backgroundPosition: ['200% 0', '-200% 0'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
                delay: 0.3 + (0.1 * i),
              }}
            />
          ))}
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
