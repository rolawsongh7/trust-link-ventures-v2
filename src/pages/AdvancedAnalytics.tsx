import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useOrdersQuery } from '@/hooks/useOrdersQuery';
import { useQuotesQuery } from '@/hooks/useQuotesQuery';
import { useCustomersQuery } from '@/hooks/useCustomersQuery';
import { useLeadsQuery } from '@/hooks/useLeadsQuery';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Users, 
  Activity, 
  Zap, 
  Clock,
  TrendingUp,
  Shield,
  AlertTriangle
} from 'lucide-react';

// Tab Components
import { ExecutiveInsightsTab } from '@/components/analytics/executive/ExecutiveInsightsTab';
import { CustomerIntelligence } from '@/components/analytics/customers/CustomerIntelligence';
import { OperationsIntelligence } from '@/components/analytics/operations/OperationsIntelligence';
import { InsightDrivenAutomation } from '@/components/analytics/automation/InsightDrivenAutomation';
import { EnhancedAuditTimeline } from '@/components/analytics/audit/EnhancedAuditTimeline';

const AdvancedAnalytics = () => {
  const { user, loading: authLoading } = useAuth();
  const { orders, isLoading: ordersLoading } = useOrdersQuery();
  const { quotes, loading: quotesLoading } = useQuotesQuery();
  const { customers, loading: customersLoading } = useCustomersQuery();
  const { leads, loading: leadsLoading } = useLeadsQuery();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isLoading = ordersLoading || quotesLoading || customersLoading || leadsLoading;

  // Calculate quick stats for header
  const pendingPayments = orders?.filter(o => o.status === 'pending_payment') || [];
  const cashAtRisk = pendingPayments.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const atRiskCustomers = orders ? new Set(
    orders.filter(o => {
      if (!o.customer_id || !o.created_at) return false;
      const daysSince = (Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 90;
    }).map(o => o.customer_id)
  ).size : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Clean Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border bg-card"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                  Business Intelligence
                </h1>
                <Badge variant="secondary" className="hidden sm:inline-flex">
                  Advanced
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Actionable insights to protect cash, improve margins, and reduce risk
              </p>
            </div>
            
            {/* Quick Stats Pills */}
            <div className="flex flex-wrap gap-2">
              {cashAtRisk > 0 && (
                <Badge 
                  variant="outline" 
                  className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  GHS {(cashAtRisk / 1000).toFixed(0)}K at risk
                </Badge>
              )}
              {atRiskCustomers > 0 && (
                <Badge 
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800"
                >
                  <Users className="h-3 w-3 mr-1" />
                  {atRiskCustomers} customers need attention
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="executive" className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-muted/50 p-1 h-auto">
            <TabsTrigger 
              value="executive" 
              className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background"
            >
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Executive</span> Insights
            </TabsTrigger>
            <TabsTrigger 
              value="customers" 
              className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Customer &</span> Revenue
            </TabsTrigger>
            <TabsTrigger 
              value="operations" 
              className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background"
            >
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Operations &</span> Risk
            </TabsTrigger>
            <TabsTrigger 
              value="automation" 
              className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background"
            >
              <Zap className="h-4 w-4" />
              Automation
            </TabsTrigger>
            <TabsTrigger 
              value="audit" 
              className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background"
            >
              <Clock className="h-4 w-4" />
              Audit <span className="hidden sm:inline">& History</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Executive Insights */}
          <TabsContent value="executive" className="mt-6">
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <ExecutiveInsightsTab
                orders={orders || []}
                quotes={quotes || []}
                customers={customers || []}
              />
            )}
          </TabsContent>

          {/* Tab 2: Customer & Revenue Intelligence */}
          <TabsContent value="customers" className="mt-6">
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <CustomerIntelligence
                orders={orders || []}
                customers={customers || []}
              />
            )}
          </TabsContent>

          {/* Tab 3: Operations & Risk Intelligence */}
          <TabsContent value="operations" className="mt-6">
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <OperationsIntelligence orders={orders || []} />
            )}
          </TabsContent>

          {/* Tab 4: Automation & Alerts */}
          <TabsContent value="automation" className="mt-6">
            <InsightDrivenAutomation />
          </TabsContent>

          {/* Tab 5: Audit & History */}
          <TabsContent value="audit" className="mt-6">
            <EnhancedAuditTimeline />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Skeleton className="h-96" />
      </div>
      <Skeleton className="h-96" />
    </div>
  </div>
);

export default AdvancedAnalytics;
