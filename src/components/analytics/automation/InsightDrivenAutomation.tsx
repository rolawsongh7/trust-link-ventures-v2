import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Save, 
  Plus, 
  Zap,
  Bell,
  Mail,
  Shield,
  Clock,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  Settings2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: {
    type: 'insight' | 'threshold' | 'schedule';
    condition: string;
  };
  action: {
    type: 'notification' | 'email' | 'status_change' | 'flag';
    details: string;
  };
  impact?: string;
  category: 'payment' | 'delivery' | 'customer' | 'risk';
}

interface InsightDrivenAutomationProps {
  // Future: pass in active insights to show recommended automations
}

const defaultRules: AutomationRule[] = [
  {
    id: '1',
    name: 'Late Payment Auto-Reminder',
    description: 'Send reminder when payment is overdue',
    enabled: true,
    trigger: {
      type: 'threshold',
      condition: 'Payment pending > 7 days'
    },
    action: {
      type: 'email',
      details: 'Send payment reminder email to customer'
    },
    impact: 'Reduces overdue payments by ~30%',
    category: 'payment'
  },
  {
    id: '2',
    name: 'High-Risk Customer Prepayment',
    description: 'Require partial prepayment for at-risk customers',
    enabled: false,
    trigger: {
      type: 'insight',
      condition: 'Customer health score = Red'
    },
    action: {
      type: 'flag',
      details: 'Flag orders for manual payment verification'
    },
    impact: 'Protects against bad debt',
    category: 'risk'
  },
  {
    id: '3',
    name: 'Delivery Delay Alert',
    description: 'Notify ops when delivery is at risk',
    enabled: true,
    trigger: {
      type: 'threshold',
      condition: 'Order stuck in processing > 3 days'
    },
    action: {
      type: 'notification',
      details: 'Send urgent notification to operations team'
    },
    impact: 'Improves on-time delivery rate',
    category: 'delivery'
  },
  {
    id: '4',
    name: 'Customer Churn Prevention',
    description: 'Alert sales when customer shows churn signals',
    enabled: true,
    trigger: {
      type: 'insight',
      condition: 'No orders in 60 days from active customer'
    },
    action: {
      type: 'notification',
      details: 'Alert assigned sales rep to reach out'
    },
    impact: 'Prevents customer churn',
    category: 'customer'
  },
  {
    id: '5',
    name: 'Quote Follow-Up Sequence',
    description: 'Auto-follow up on unanswered quotes',
    enabled: false,
    trigger: {
      type: 'schedule',
      condition: 'Quote sent > 3 days with no response'
    },
    action: {
      type: 'email',
      details: 'Send follow-up email with quote summary'
    },
    impact: 'Increases quote conversion by ~20%',
    category: 'customer'
  },
  {
    id: '6',
    name: 'Failed Delivery Review',
    description: 'Flag orders with repeated delivery failures',
    enabled: true,
    trigger: {
      type: 'threshold',
      condition: 'Failed delivery attempts >= 2'
    },
    action: {
      type: 'flag',
      details: 'Mark for address verification and manual review'
    },
    impact: 'Reduces wasted delivery attempts',
    category: 'delivery'
  }
];

const recommendedAutomations: AutomationRule[] = [
  {
    id: 'rec-1',
    name: 'Cash Flow Protection',
    description: 'Based on your current cash at risk',
    enabled: false,
    trigger: {
      type: 'insight',
      condition: 'Overdue payments > GHS 50K'
    },
    action: {
      type: 'email',
      details: 'Daily payment reminder to customers with overdue balances'
    },
    impact: 'Could recover GHS 30K+ monthly',
    category: 'payment'
  }
];

export const InsightDrivenAutomation: React.FC<InsightDrivenAutomationProps> = () => {
  const [rules, setRules] = useState<AutomationRule[]>(defaultRules);
  const [showRecommended, setShowRecommended] = useState(true);

  const toggleRule = (id: string) => {
    setRules(prev =>
      prev.map(rule =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
    const rule = rules.find(r => r.id === id);
    toast.success(`${rule?.name} ${rule?.enabled ? 'disabled' : 'enabled'}`);
  };

  const enableRecommended = (rule: AutomationRule) => {
    setRules(prev => [...prev, { ...rule, id: `custom-${Date.now()}`, enabled: true }]);
    toast.success(`${rule.name} automation enabled`);
  };

  const saveWorkflows = () => {
    toast.success('Automation settings saved');
  };

  const getCategoryIcon = (category: AutomationRule['category']) => {
    switch (category) {
      case 'payment': return <DollarSign className="h-4 w-4" />;
      case 'delivery': return <Clock className="h-4 w-4" />;
      case 'customer': return <TrendingUp className="h-4 w-4" />;
      case 'risk': return <Shield className="h-4 w-4" />;
    }
  };

  const getCategoryStyles = (category: AutomationRule['category']) => {
    switch (category) {
      case 'payment':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'delivery':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'customer':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'risk':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    }
  };

  const getActionIcon = (type: AutomationRule['action']['type']) => {
    switch (type) {
      case 'notification': return <Bell className="h-3 w-3" />;
      case 'email': return <Mail className="h-3 w-3" />;
      case 'status_change': return <Settings2 className="h-3 w-3" />;
      case 'flag': return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const enabledCount = rules.filter(r => r.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Insight-Driven Automation
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {enabledCount} of {rules.length} automations active
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
          <Button size="sm" onClick={saveWorkflows}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Recommended Based on Insights */}
      {showRecommended && recommendedAutomations.length > 0 && (
        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Recommended Automations
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowRecommended(false)}
              >
                Dismiss
              </Button>
            </div>
            <CardDescription>Based on your current business insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendedAutomations.map((rule, index) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{rule.name}</span>
                      <Badge className={getCategoryStyles(rule.category)}>
                        {getCategoryIcon(rule.category)}
                        <span className="ml-1 capitalize">{rule.category}</span>
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                    {rule.impact && (
                      <p className="text-xs text-primary font-medium mt-1">
                        💰 {rule.impact}
                      </p>
                    )}
                  </div>
                  <Button size="sm" onClick={() => enableRecommended(rule)}>
                    Enable
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Automations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active Automations</CardTitle>
          <CardDescription>Configure triggers, actions, and thresholds</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {rules.map((rule, index) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={cn(
                    'transition-all',
                    rule.enabled ? 'border-l-4 border-l-green-500' : 'opacity-70'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getCategoryStyles(rule.category)}>
                              {getCategoryIcon(rule.category)}
                              <span className="ml-1 capitalize">{rule.category}</span>
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getActionIcon(rule.action.type)}
                              <span className="ml-1 capitalize">{rule.action.type.replace('_', ' ')}</span>
                            </Badge>
                          </div>
                          
                          <h4 className="font-semibold text-sm mb-1">{rule.name}</h4>
                          <p className="text-xs text-muted-foreground mb-3">
                            {rule.description}
                          </p>

                          <div className="grid gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground w-16">Trigger:</span>
                              <Badge variant="secondary" className="font-normal">
                                {rule.trigger.condition}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground w-16">Action:</span>
                              <span>{rule.action.details}</span>
                            </div>
                            {rule.impact && (
                              <div className="flex items-center gap-2 text-primary">
                                <span className="text-muted-foreground w-16">Impact:</span>
                                <span className="font-medium">{rule.impact}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={() => toggleRule(rule.id)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {rule.enabled ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
