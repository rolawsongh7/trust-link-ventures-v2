import React, { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy components for better performance
const PartnerCard = lazy(() => import('./PartnerCard'));

interface Partner {
  name: string;
  location: string;
  description: string;
  specialties: string[];
  established: string;
  website?: string;
  reach?: string;
  logo: string;
}

interface PartnerGridProps {
  partners: Partner[];
}

const PartnerGrid: React.FC<PartnerGridProps> = ({ partners }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
      {partners.map((partner, index) => (
        <Suspense
          key={`${partner.name}-${index}`}
          fallback={
            <div className="space-y-4 p-4">
              <Skeleton className="h-40 sm:h-48 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          }
        >
          <PartnerCard partner={partner} index={index} />
        </Suspense>
      ))}
    </div>
  );
};

export default PartnerGrid;