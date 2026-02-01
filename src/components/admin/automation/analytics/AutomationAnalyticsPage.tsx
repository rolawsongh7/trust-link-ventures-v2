/**
 * Phase 4.4: Automation Analytics Page
 * Main analytics dashboard for automation performance
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, ThumbsUp, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { automationAnalyticsKeys } from '@/hooks/useAutomationAnalytics';
import { HealthOverviewSection } from './HealthOverviewSection';
import { RulePerformanceTable } from './RulePerformanceTable';
import { CustomerImpactSection } from './CustomerImpactSection';
import { StaffTrustSection } from './StaffTrustSection';
import { RuleDetailDrawer } from './RuleDetailDrawer';

interface AutomationAnalyticsPageProps {
  embedded?: boolean;
}

export const AutomationAnalyticsPage: React.FC<AutomationAnalyticsPageProps> = ({ 
  embedded = false 
}) => {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: automationAnalyticsKeys.all });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const content = (
    <div className="space-y-6">
      {/* Header (only if not embedded) */}
      {!embedded && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Automation Analytics
                <Badge variant="secondary">Phase 4.4</Badge>
              </h1>
              <p className="text-muted-foreground">
                Monitor performance, trust metrics, and ROI
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </motion.div>
      )}

      {/* Refresh button for embedded view */}
      {embedded && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      )}

      {/* Health Overview */}
      <HealthOverviewSection />

      {/* Tabbed Content */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Rule Performance
          </TabsTrigger>
          <TabsTrigger value="customer" className="gap-2">
            <Users className="h-4 w-4" />
            Customer Impact
          </TabsTrigger>
          <TabsTrigger value="trust" className="gap-2">
            <ThumbsUp className="h-4 w-4" />
            Staff Trust
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <RulePerformanceTable onSelectRule={setSelectedRuleId} />
          </motion.div>
        </TabsContent>

        <TabsContent value="customer">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CustomerImpactSection />
          </motion.div>
        </TabsContent>

        <TabsContent value="trust">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <StaffTrustSection />
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Rule Detail Drawer */}
      <RuleDetailDrawer
        ruleId={selectedRuleId}
        onClose={() => setSelectedRuleId(null)}
      />
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="p-6">
      {content}
    </div>
  );
};

export default AutomationAnalyticsPage;
