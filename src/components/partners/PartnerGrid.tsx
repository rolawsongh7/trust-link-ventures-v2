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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {partners.map((partner, index) => (
        <Suspense
          key={`${partner.name}-${index}`}
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
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