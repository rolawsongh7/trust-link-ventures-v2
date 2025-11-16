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
import { TrendingUp, DollarSign, FileText, Target } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Automation</h1>
          <p className="text-muted-foreground">Business intelligence and workflow automation</p>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList>
            <TabsTrigger value="analytics">Analytics Dashboard</TabsTrigger>
            <TabsTrigger value="workflow">Workflow Automation</TabsTrigger>
            <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
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
