import React from 'react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { CustomerStandingOrdersWidget } from '@/components/subscriptions';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

const CustomerStandingOrdersPage = () => {
  const { profile } = useCustomerAuth();

  const { data: customerId, isLoading } = useQuery({
    queryKey: ['customer-mapping', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase
        .from('customer_users')
        .select('customer_id')
        .eq('user_id', profile.id)
        .single();
      return data?.customer_id || profile.id;
    },
    enabled: !!profile?.id,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customerId) return null;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Subscriptions</h1>
        <p className="text-muted-foreground text-sm">Your recurring order schedules</p>
      </div>
      <CustomerStandingOrdersWidget customerId={customerId} compact={false} />
    </div>
  );
};

export default CustomerStandingOrdersPage;
