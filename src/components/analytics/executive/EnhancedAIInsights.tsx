import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  ArrowRight,
  RefreshCw,
  DollarSign,
  Clock,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Order } from '@/hooks/useOrdersQuery';
import type { Quote } from '@/hooks/useQuotesQuery';
import type { Customer } from '@/hooks/useCustomersQuery';

interface StructuredInsight {
  id: string;
  category: 'risk' | 'opportunity' | 'optimization' | 'prediction';
  title: string;
  what: string;
  why: string;
  impact: {
    value: string;
    type: 'revenue' | 'cost' | 'time' | 'risk';
  };
  action: {
    label: string;
    link?: string;
  };
  confidence: number;
  urgency: 'immediate' | 'soon' | 'monitor';
}

interface EnhancedAIInsightsProps {
  orders: Order[];
  quotes: Quote[];
  customers: Customer[];
}

export const EnhancedAIInsights: React.FC<EnhancedAIInsightsProps> = ({
  orders,
  quotes,
  customers
}) => {
  const [insights, setInsights] = useState<StructuredInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
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
            customer_id: o.customer_id,
            payment_verified_at: o.payment_verified_at,
            estimated_delivery_date: o.estimated_delivery_date
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
          timeframe: '90days',
          format: 'structured'
        }
      });

      if (error) throw error;

      if (data?.success && data?.insights) {
        const formattedInsights = formatStructuredInsights(data.insights);
        setInsights(formattedInsights);
        
        if (refresh) {
          toast({
            title: "Insights Refreshed",
            description: `Generated ${formattedInsights.length} actionable insights`,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      // Generate fallback insights from local data
      const fallbackInsights = generateLocalInsights(orders, quotes, customers);
      setInsights(fallbackInsights);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (orders.length > 0 || quotes.length > 0 || customers.length > 0) {
      fetchAIInsights();
    } else {
      setIsLoading(false);
    }
  }, [orders.length, quotes.length, customers.length]);

  const formatStructuredInsights = (rawInsights: any): StructuredInsight[] => {
    const formatted: StructuredInsight[] = [];

    // Process profitability drivers
    rawInsights.profitability_drivers?.top_customers?.forEach((customer: any, idx: number) => {
      formatted.push({
        id: `profit-${idx}`,
        category: 'opportunity',
        title: `Top Performer: ${customer.customer}`,
        what: customer.insight || `This customer contributes ${customer.revenue_contribution} of your revenue.`,
        why: 'Protecting and expanding relationships with top customers directly impacts bottom line.',
        impact: {
          value: customer.revenue_contribution || 'High Revenue',
          type: 'revenue'
        },
        action: {
          label: 'View customer profile',
          link: '/customers'
        },
        confidence: 95,
        urgency: 'monitor'
      });
    });

    rawInsights.profitability_drivers?.growth_opportunities?.forEach((opp: any, idx: number) => {
      formatted.push({
        id: `growth-${idx}`,
        category: 'opportunity',
        title: opp.opportunity || 'Growth Opportunity',
        what: opp.description || opp.potential_impact || 'Potential for revenue expansion identified.',
        why: 'Capturing growth opportunities increases market share and revenue.',
        impact: {
          value: opp.potential_impact || 'Revenue Growth',
          type: 'revenue'
        },
        action: {
          label: 'Explore opportunity'
        },
        confidence: 75,
        urgency: 'soon'
      });
    });

    // Process risks
    rawInsights.risks?.forEach((risk: any, idx: number) => {
      formatted.push({
        id: `risk-${idx}`,
        category: 'risk',
        title: risk.risk_type || 'Risk Detected',
        what: risk.description || 'A potential risk has been identified.',
        why: 'Addressing risks early prevents revenue loss and operational disruption.',
        impact: {
          value: risk.potential_loss || 'Potential Loss',
          type: 'risk'
        },
        action: {
          label: risk.recommendation || 'Review and mitigate'
        },
        confidence: 80,
        urgency: risk.severity === 'high' ? 'immediate' : 'soon'
      });
    });

    // Process churn predictions
    rawInsights.predictions?.churn_risk_customers?.forEach((customer: any, idx: number) => {
      formatted.push({
        id: `churn-${idx}`,
        category: 'prediction',
        title: `Churn Risk: ${customer.customer}`,
        what: customer.reason || 'Customer showing signs of disengagement.',
        why: 'Retaining existing customers costs 5x less than acquiring new ones.',
        impact: {
          value: `Risk Score: ${customer.risk_score || 'High'}`,
          type: 'risk'
        },
        action: {
          label: 'Schedule check-in',
          link: '/customers'
        },
        confidence: customer.risk_score ? 90 - customer.risk_score : 70,
        urgency: 'immediate'
      });
    });

    // Process recommendations
    rawInsights.recommendations?.forEach((rec: any, idx: number) => {
      formatted.push({
        id: `rec-${idx}`,
        category: 'optimization',
        title: rec.action || 'Process Improvement',
        what: rec.description || rec.expected_impact || 'Efficiency improvement identified.',
        why: 'Operational optimizations reduce costs and improve customer satisfaction.',
        impact: {
          value: rec.expected_impact || 'Efficiency Gain',
          type: 'cost'
        },
        action: {
          label: 'Implement'
        },
        confidence: 70,
        urgency: rec.priority === 'high' ? 'soon' : 'monitor'
      });
    });

    return formatted.slice(0, 12);
  };

  const generateLocalInsights = (
    orders: Order[], 
    quotes: Quote[], 
    customers: Customer[]
  ): StructuredInsight[] => {
    const insights: StructuredInsight[] = [];

    // Pending payment insight
    const pendingOrders = orders.filter(o => o.status === 'pending_payment');
    const pendingTotal = pendingOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    if (pendingTotal > 0) {
      insights.push({
        id: 'local-pending',
        category: 'risk',
        title: 'Outstanding Payments',
        what: `${pendingOrders.length} orders worth GHS ${(pendingTotal/1000).toFixed(0)}K are awaiting payment.`,
        why: 'Delayed payments impact cash flow and working capital.',
        impact: { value: `GHS ${(pendingTotal/1000).toFixed(0)}K`, type: 'revenue' },
        action: { label: 'Review pending orders', link: '/orders?filter=pending_payment' },
        confidence: 100,
        urgency: pendingOrders.length > 5 ? 'immediate' : 'soon'
      });
    }

    // Quote follow-up insight
    const pendingQuotes = quotes.filter(q => q.status === 'sent');
    const oldQuotes = pendingQuotes.filter(q => {
      if (!q.created_at) return false;
      return (Date.now() - new Date(q.created_at).getTime()) > (7 * 24 * 60 * 60 * 1000);
    });
    if (oldQuotes.length > 0) {
      const quoteValue = oldQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0);
      insights.push({
        id: 'local-quotes',
        category: 'opportunity',
        title: 'Stale Quotes Need Attention',
        what: `${oldQuotes.length} quotes sent over a week ago have not received a response.`,
        why: 'Timely follow-up increases quote-to-order conversion by up to 50%.',
        impact: { value: `GHS ${(quoteValue/1000).toFixed(0)}K potential`, type: 'revenue' },
        action: { label: 'Follow up on quotes', link: '/quotes?filter=sent' },
        confidence: 90,
        urgency: 'soon'
      });
    }

    return insights;
  };

  const getCategoryIcon = (category: StructuredInsight['category']) => {
    switch (category) {
      case 'opportunity': return <TrendingUp className="h-4 w-4" />;
      case 'risk': return <AlertTriangle className="h-4 w-4" />;
      case 'optimization': return <Lightbulb className="h-4 w-4" />;
      case 'prediction': return <Target className="h-4 w-4" />;
    }
  };

  const getCategoryStyles = (category: StructuredInsight['category']) => {
    switch (category) {
      case 'opportunity':
        return {
          border: 'border-l-green-500',
          badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          icon: 'text-green-600'
        };
      case 'risk':
        return {
          border: 'border-l-red-500',
          badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          icon: 'text-red-600'
        };
      case 'optimization':
        return {
          border: 'border-l-blue-500',
          badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          icon: 'text-blue-600'
        };
      case 'prediction':
        return {
          border: 'border-l-purple-500',
          badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
          icon: 'text-purple-600'
        };
    }
  };

  const getUrgencyBadge = (urgency: StructuredInsight['urgency']) => {
    switch (urgency) {
      case 'immediate':
        return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
      case 'soon':
        return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30">Soon</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Monitor</Badge>;
    }
  };

  const getImpactIcon = (type: StructuredInsight['impact']['type']) => {
    switch (type) {
      case 'revenue': return <DollarSign className="h-3 w-3" />;
      case 'cost': return <TrendingUp className="h-3 w-3" />;
      case 'time': return <Clock className="h-3 w-3" />;
      case 'risk': return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const filteredInsights = activeCategory === 'all' 
    ? insights 
    : insights.filter(i => i.category === activeCategory);

  const categoryCounts = {
    all: insights.length,
    risk: insights.filter(i => i.category === 'risk').length,
    opportunity: insights.filter(i => i.category === 'opportunity').length,
    optimization: insights.filter(i => i.category === 'optimization').length,
    prediction: insights.filter(i => i.category === 'prediction').length
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle>AI Insights</CardTitle>
          </div>
          <CardDescription>Generating intelligent recommendations...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Insights
            </CardTitle>
            <CardDescription className="mt-1">
              {insights.length} actionable recommendations based on your data
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchAIInsights(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Category Filter Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-4">
          <TabsList className="h-9 w-full justify-start overflow-x-auto">
            <TabsTrigger value="all" className="text-xs">
              All ({categoryCounts.all})
            </TabsTrigger>
            <TabsTrigger value="risk" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Risks ({categoryCounts.risk})
            </TabsTrigger>
            <TabsTrigger value="opportunity" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Opportunities ({categoryCounts.opportunity})
            </TabsTrigger>
            <TabsTrigger value="optimization" className="text-xs">
              <Lightbulb className="h-3 w-3 mr-1" />
              Optimize ({categoryCounts.optimization})
            </TabsTrigger>
            <TabsTrigger value="prediction" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              Predictions ({categoryCounts.prediction})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Insights List */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredInsights.map((insight, index) => {
                const styles = getCategoryStyles(insight.category);
                
                return (
                  <motion.div
                    key={insight.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={cn('border-l-4 hover:shadow-md transition-all', styles.border)}>
                      <CardContent className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className={cn('text-xs', styles.badge)}>
                              <span className={styles.icon}>{getCategoryIcon(insight.category)}</span>
                              <span className="ml-1 capitalize">{insight.category}</span>
                            </Badge>
                            {getUrgencyBadge(insight.urgency)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{insight.confidence}% confidence</span>
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="font-semibold text-sm mb-2">{insight.title}</h4>

                        {/* What's happening */}
                        <div className="space-y-2 mb-3">
                          <p className="text-sm text-muted-foreground">{insight.what}</p>
                          <p className="text-xs text-muted-foreground/80 italic">
                            Why it matters: {insight.why}
                          </p>
                        </div>

                        {/* Impact & Action */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                            {getImpactIcon(insight.impact.type)}
                            <span>Impact: {insight.impact.value}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            {insight.action.label}
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredInsights.length === 0 && (
              <div className="text-center py-12">
                <Sparkles className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No {activeCategory !== 'all' ? activeCategory : ''} insights available.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
