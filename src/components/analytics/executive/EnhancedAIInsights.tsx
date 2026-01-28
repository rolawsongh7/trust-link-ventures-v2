import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  RefreshCw,
  DollarSign,
  Clock,
  ChevronRight,
  ChevronDown,
  BellOff,
  Database,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAlertThrottling } from '@/hooks/useAlertThrottling';
import type { Order } from '@/hooks/useOrdersQuery';
import type { Quote } from '@/hooks/useQuotesQuery';
import type { Customer } from '@/hooks/useCustomersQuery';

interface StructuredInsight {
  id: string;
  type: 'risk' | 'opportunity' | 'optimization' | 'prediction';
  title: string;
  summary: string;
  why_it_matters: string;
  estimated_financial_impact?: {
    amount: number;
    currency: string;
    confidence: 'low' | 'medium' | 'high';
  };
  recommended_action: string;
  urgency: 'immediate' | 'soon' | 'monitor';
  confidence_score: number;
  data_sources?: string[];
  time_horizon?: 'short_term' | 'medium_term';
  // Legacy fields for backward compatibility
  category?: 'risk' | 'opportunity' | 'optimization' | 'prediction';
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
  const [executiveSummary, setExecutiveSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { 
    snoozeInsight, 
    getSnoozedCount,
    clearAllSnoozes 
  } = useAlertThrottling<StructuredInsight>();

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
            estimated_delivery_date: o.estimated_delivery_date,
            delivered_at: o.delivered_at,
            failed_delivery_count: o.failed_delivery_count
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

      if (data?.success) {
        // Handle new format (array of insights) or legacy format
        const rawInsights = Array.isArray(data.insights) 
          ? data.insights 
          : formatLegacyInsights(data.insights);
        
        const formattedInsights = rawInsights.map((insight: any, idx: number) => ({
          ...insight,
          id: insight.id || `insight-${idx}`,
          type: insight.type || insight.category || 'optimization',
          category: insight.type || insight.category || 'optimization'
        }));
        
        setInsights(formattedInsights);
        setExecutiveSummary(data.executive_summary || '');
        
        if (refresh) {
          toast({
            title: "Insights Refreshed",
            description: `Generated ${formattedInsights.length} actionable insights`,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      const fallbackInsights = generateLocalInsights(orders, quotes, customers);
      setInsights(fallbackInsights);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Format legacy API response to new structure
  const formatLegacyInsights = (legacyData: any): StructuredInsight[] => {
    const insights: StructuredInsight[] = [];
    
    // Process risks
    legacyData?.risks?.forEach((risk: any, idx: number) => {
      insights.push({
        id: `risk-${idx}`,
        type: 'risk',
        title: risk.risk_type || 'Risk Detected',
        summary: risk.description || '',
        why_it_matters: 'Addressing risks early prevents revenue loss.',
        recommended_action: risk.recommendation || 'Review and mitigate',
        urgency: risk.severity === 'high' ? 'immediate' : 'soon',
        confidence_score: 0.8
      });
    });

    // Process recommendations
    legacyData?.recommendations?.forEach((rec: any, idx: number) => {
      insights.push({
        id: `rec-${idx}`,
        type: 'optimization',
        title: rec.action || 'Optimization',
        summary: rec.expected_impact || '',
        why_it_matters: 'Operational improvements reduce costs.',
        recommended_action: rec.action || 'Implement improvement',
        urgency: rec.priority === 'high' ? 'soon' : 'monitor',
        confidence_score: 0.7
      });
    });

    return insights;
  };

  useEffect(() => {
    if (orders.length > 0 || quotes.length > 0 || customers.length > 0) {
      fetchAIInsights();
    } else {
      setIsLoading(false);
    }
  }, [orders.length, quotes.length, customers.length]);

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
        type: 'risk',
        title: 'Outstanding Payments',
        summary: `${pendingOrders.length} orders worth GHS ${(pendingTotal/1000).toFixed(0)}K are awaiting payment.`,
        why_it_matters: 'Delayed payments impact cash flow and working capital.',
        estimated_financial_impact: {
          amount: pendingTotal,
          currency: 'GHS',
          confidence: 'high'
        },
        recommended_action: 'Review pending orders and send payment reminders',
        urgency: pendingOrders.length > 5 ? 'immediate' : 'soon',
        confidence_score: 1,
        data_sources: ['orders', 'payments'],
        time_horizon: 'short_term'
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
        type: 'opportunity',
        title: 'Stale Quotes Need Attention',
        summary: `${oldQuotes.length} quotes sent over a week ago have not received a response.`,
        why_it_matters: 'Timely follow-up increases quote-to-order conversion by up to 50%.',
        estimated_financial_impact: {
          amount: quoteValue * 0.25,
          currency: 'GHS',
          confidence: 'medium'
        },
        recommended_action: 'Follow up with phone calls or personalized emails',
        urgency: 'soon',
        confidence_score: 0.9,
        data_sources: ['quotes'],
        time_horizon: 'short_term'
      });
    }

    return insights;
  };

  const getCategoryIcon = (type: StructuredInsight['type']) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-4 w-4" />;
      case 'risk': return <AlertTriangle className="h-4 w-4" />;
      case 'optimization': return <Lightbulb className="h-4 w-4" />;
      case 'prediction': return <Target className="h-4 w-4" />;
    }
  };

  const getCategoryStyles = (type: StructuredInsight['type']) => {
    switch (type) {
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
        return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30">This Week</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Monitor</Badge>;
    }
  };

  const getConfidenceBadge = (confidence: 'low' | 'medium' | 'high') => {
    switch (confidence) {
      case 'high':
        return <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">High confidence</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Medium confidence</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">Low confidence</Badge>;
    }
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) return `GHS ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `GHS ${(amount / 1000).toFixed(0)}K`;
    return `GHS ${amount.toFixed(0)}`;
  };

  const handleSnooze = (insightId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    snoozeInsight(insightId, 24);
    toast({
      title: "Insight Snoozed",
      description: "This insight won't appear for the next 24 hours",
    });
  };

  const filteredInsights = activeCategory === 'all' 
    ? insights 
    : insights.filter(i => i.type === activeCategory);

  const categoryCounts = {
    all: insights.length,
    risk: insights.filter(i => i.type === 'risk').length,
    opportunity: insights.filter(i => i.type === 'opportunity').length,
    optimization: insights.filter(i => i.type === 'optimization').length,
    prediction: insights.filter(i => i.type === 'prediction').length
  };

  const snoozedCount = getSnoozedCount();

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
              {insights.length} actionable recommendations
              {snoozedCount > 0 && (
                <span className="ml-2 text-muted-foreground">
                  · {snoozedCount} snoozed
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {snoozedCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  clearAllSnoozes();
                  toast({ title: "Snoozes Cleared", description: "All insights are now visible" });
                }}
              >
                <BellOff className="h-4 w-4 mr-1" />
                Clear snoozes
              </Button>
            )}
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
        </div>

        {/* Executive Summary */}
        {executiveSummary && (
          <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Summary:</strong> {executiveSummary}
            </p>
          </div>
        )}
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
                const styles = getCategoryStyles(insight.type);
                const isExpanded = expandedInsight === insight.id;
                
                return (
                  <motion.div
                    key={insight.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Collapsible 
                      open={isExpanded} 
                      onOpenChange={() => setExpandedInsight(isExpanded ? null : insight.id)}
                    >
                      <Card className={cn('border-l-4 hover:shadow-md transition-all', styles.border)}>
                        <CollapsibleTrigger asChild>
                          <CardContent className="p-4 cursor-pointer">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={cn('text-xs', styles.badge)}>
                                  <span className={styles.icon}>{getCategoryIcon(insight.type)}</span>
                                  <span className="ml-1 capitalize">{insight.type}</span>
                                </Badge>
                                {getUrgencyBadge(insight.urgency)}
                                {insight.time_horizon && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {insight.time_horizon === 'short_term' ? '1-2 weeks' : '1-3 months'}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(insight.confidence_score * 100)}%
                                </span>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {/* Title */}
                            <h4 className="font-semibold text-sm mb-2">{insight.title}</h4>

                            {/* Summary */}
                            <p className="text-sm text-muted-foreground mb-3">{insight.summary}</p>

                            {/* Financial Impact Badge */}
                            {insight.estimated_financial_impact && (
                              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                <DollarSign className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium text-primary">
                                  {formatCurrency(insight.estimated_financial_impact.amount)}
                                </span>
                                {getConfidenceBadge(insight.estimated_financial_impact.confidence)}
                              </div>
                            )}
                          </CardContent>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                            {/* Why it matters */}
                            <div>
                              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                                <Info className="h-3 w-3" />
                                Why it matters
                              </div>
                              <p className="text-sm">{insight.why_it_matters}</p>
                            </div>

                            {/* Recommended Action */}
                            <div>
                              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                                <Target className="h-3 w-3" />
                                Recommended Action
                              </div>
                              <p className="text-sm font-medium text-primary">{insight.recommended_action}</p>
                            </div>

                            {/* Data Sources */}
                            {insight.data_sources && insight.data_sources.length > 0 && (
                              <div className="flex items-center gap-2 pt-2">
                                <Database className="h-3 w-3 text-muted-foreground" />
                                <div className="flex gap-1">
                                  {insight.data_sources.map(source => (
                                    <Badge key={source} variant="outline" className="text-xs">
                                      {source}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 pt-2">
                              <Button size="sm" className="flex-1">
                                Take Action
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => handleSnooze(insight.id, e)}
                              >
                                <BellOff className="h-4 w-4 mr-1" />
                                Snooze 24h
                              </Button>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredInsights.length === 0 && (
              <div className="text-center py-12">
                <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  No {activeCategory !== 'all' ? activeCategory : ''} insights available
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
