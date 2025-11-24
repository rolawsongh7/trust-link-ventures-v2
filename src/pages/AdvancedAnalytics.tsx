import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useOrdersQuery } from '@/hooks/useOrdersQuery';
import { useQuotesQuery } from '@/hooks/useQuotesQuery';
import { useCustomersQuery } from '@/hooks/useCustomersQuery';
import { useLeadsQuery } from '@/hooks/useLeadsQuery';
import { PortalPageHeader } from '@/components/customer/PortalPageHeader';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { WorkflowAutomation } from '@/components/workflow/WorkflowAutomation';
import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, DollarSign, Package, Target } from 'lucide-react';

const AdvancedAnalytics = () => {
  const { user, loading: authLoading } = useAuth();
  const { orders, isLoading: ordersLoading } = useOrdersQuery();
  const { quotes, loading: quotesLoading } = useQuotesQuery();
  const { customers, loading: customersLoading } = useCustomersQuery();
  const { leads, loading: leadsLoading } = useLeadsQuery();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isLoading = ordersLoading || quotesLoading || customersLoading || leadsLoading;
  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
  const conversionRate = quotes?.length ? Math.round(((quotes?.filter(q => q.status === 'accepted').length || 0) / quotes.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <PortalPageHeader
          variant="admin"
          title="Advanced Analytics"
          subtitle="Business intelligence and workflow automation"
          totalIcon={TrendingUp}
          totalCount={orders?.length || 0}
          stats={[
            { label: 'Revenue', count: totalRevenue, icon: DollarSign },
            { label: 'Active Orders', count: orders?.filter(o => o.status === 'processing').length || 0, icon: Package },
            { label: 'Conversion', count: conversionRate, icon: Target },
          ]}
        />

        <Tabs defaultValue="analytics" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="analytics" className="text-xs sm:text-sm whitespace-nowrap">
              Analytics Dashboard
            </TabsTrigger>
            <TabsTrigger value="workflow" className="text-xs sm:text-sm whitespace-nowrap">
              Workflow Automation
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm whitespace-nowrap">
              Activity Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-96" />
                  ))}
                </div>
              </div>
            ) : (
              <AnalyticsDashboard
                orders={orders}
                quotes={quotes}
                customers={customers}
                leads={leads}
              />
            )}
          </TabsContent>

          <TabsContent value="workflow">
            <WorkflowAutomation />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTimeline />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
