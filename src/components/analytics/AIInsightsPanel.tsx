import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/hooks/useOrdersQuery';
import type { Quote } from '@/hooks/useQuotesQuery';
import type { Customer } from '@/hooks/useCustomersQuery';

interface AIInsight {
  id: string;
  category: 'opportunity' | 'risk' | 'optimization' | 'prediction';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
  impact?: string;
}

interface AIInsightsPanelProps {
  orders: Order[];
  quotes: Quote[];
  customers: Customer[];
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  orders,
  quotes,
  customers
}) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchAIInsights = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-analytics', {
        body: {
          orders: orders.map(o => ({
            id: o.id,
            total_amount: o.total_amount,
            status: o.status,
            created_at: o.created_at,
            customer_id: o.customer_id
          })),
          quotes: quotes.map(q => ({
            id: q.id,
            status: q.status,
            total_amount: q.total_amount,
            created_at: q.created_at,
            customer_id: q.customer_id
          })),
          customers: customers.map(c => ({
            id: c.id,
            company_name: c.company_name,
            created_at: c.created_at
          })),
          timeframe: '90days'
        }
      });

      if (error) throw error;

      if (data?.success && data?.insights) {
        const formattedInsights = formatInsights(data.insights);
        setInsights(formattedInsights);
        
        if (refresh) {
          toast({
            title: "Insights Refreshed",
            description: `Generated ${formattedInsights.length} new insights`,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      toast({
        title: "Failed to generate insights",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (orders.length > 0 || quotes.length > 0 || customers.length > 0) {
      fetchAIInsights();
    }
  }, [orders.length, quotes.length, customers.length]);

  const formatInsights = (rawInsights: any): AIInsight[] => {
    const formatted: AIInsight[] = [];

    // Process profitability drivers
    rawInsights.profitability_drivers?.top_customers?.forEach((customer: any, idx: number) => {
      formatted.push({
        id: `profit-${idx}`,
        category: 'opportunity',
        priority: 'high',
        title: `Top Customer: ${customer.customer}`,
        description: customer.insight,
        impact: customer.revenue_contribution
      });
    });

    rawInsights.profitability_drivers?.growth_opportunities?.forEach((opp: any, idx: number) => {
      formatted.push({
        id: `growth-${idx}`,
        category: 'opportunity',
        priority: opp.priority || 'medium',
        title: opp.opportunity,
        description: opp.potential_impact || '',
        action: 'Explore opportunity'
      });
    });

    // Process risks
    rawInsights.risks?.forEach((risk: any, idx: number) => {
      formatted.push({
        id: `risk-${idx}`,
        category: 'risk',
        priority: risk.severity || 'medium',
        title: risk.risk_type,
        description: risk.description,
        action: risk.recommendation
      });
    });

    // Process predictions
    rawInsights.predictions?.churn_risk_customers?.forEach((customer: any, idx: number) => {
      formatted.push({
        id: `churn-${idx}`,
        category: 'risk',
        priority: 'high',
        title: `Churn Risk: ${customer.customer}`,
        description: customer.reason,
        impact: `Risk Score: ${customer.risk_score}`,
        action: 'Reach out to customer'
      });
    });

    // Process recommendations
    rawInsights.recommendations?.forEach((rec: any, idx: number) => {
      formatted.push({
        id: `rec-${idx}`,
        category: 'optimization',
        priority: rec.priority || 'medium',
        title: rec.action,
        description: rec.expected_impact,
        action: 'Implement recommendation'
      });
    });

    return formatted.slice(0, 12); // Limit to 12 insights
  };

  const getCategoryIcon = (category: AIInsight['category']) => {
    switch (category) {
      case 'opportunity':
        return <TrendingUp className="h-4 w-4" />;
      case 'risk':
        return <AlertTriangle className="h-4 w-4" />;
      case 'optimization':
        return <Lightbulb className="h-4 w-4" />;
      case 'prediction':
        return <Target className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: AIInsight['category']) => {
    switch (category) {
      case 'opportunity':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'risk':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'optimization':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'prediction':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    }
  };

  const getPriorityColor = (priority: AIInsight['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Powered Insights
              </CardTitle>
              <CardDescription>Generating intelligent recommendations...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Insights
            </CardTitle>
            <CardDescription>
              {insights.length} actionable recommendations powered by AI
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchAIInsights(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <AnimatePresence>
            {insights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-l-4 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getCategoryColor(insight.category)} variant="secondary">
                            {getCategoryIcon(insight.category)}
                            <span className="ml-1 capitalize">{insight.category}</span>
                          </Badge>
                          <Badge className={getPriorityColor(insight.priority)} variant="outline">
                            {insight.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                        
                        {insight.impact && (
                          <p className="text-xs text-primary font-medium mb-2">
                            💰 {insight.impact}
                          </p>
                        )}
                        
                        {insight.action && (
                          <Button variant="ghost" size="sm" className="h-8 text-xs">
                            {insight.action}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {insights.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No insights available yet. Check back after more data is collected.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
