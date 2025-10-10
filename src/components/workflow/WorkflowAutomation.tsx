import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Plus } from 'lucide-react';

interface WorkflowRule {
  id: string;
  name: string;
  enabled: boolean;
  type: 'status_transition' | 'email_reminder' | 'lead_scoring' | 'notification';
  config: Record<string, any>;
}

const defaultRules: WorkflowRule[] = [
  {
    id: '1',
    name: 'Auto-mark delivered after 7 days',
    enabled: true,
    type: 'status_transition',
    config: {
      fromStatus: 'shipped',
      toStatus: 'delivered',
      delayDays: 7,
      entityType: 'orders',
    },
  },
  {
    id: '2',
    name: 'Send payment reminder after 3 days',
    enabled: true,
    type: 'email_reminder',
    config: {
      entityType: 'orders',
      status: 'pending_payment',
      delayDays: 3,
      emailTemplate: 'payment_reminder',
    },
  },
  {
    id: '3',
    name: 'Follow-up on pending quotes after 2 days',
    enabled: false,
    type: 'email_reminder',
    config: {
      entityType: 'quotes',
      status: 'sent',
      delayDays: 2,
      emailTemplate: 'quote_followup',
    },
  },
  {
    id: '4',
    name: 'Auto-score leads based on activity',
    enabled: true,
    type: 'lead_scoring',
    config: {
      emailOpened: 10,
      linkClicked: 20,
      quoteRequested: 30,
      orderPlaced: 50,
    },
  },
];

export const WorkflowAutomation: React.FC = () => {
  const [rules, setRules] = useState<WorkflowRule[]>(defaultRules);

  const toggleRule = (id: string) => {
    setRules(prev =>
      prev.map(rule =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
    toast.success('Workflow rule updated');
  };

  const saveWorkflows = () => {
    // In a real app, save to database
    toast.success('Workflow automation settings saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Automation</h2>
          <p className="text-muted-foreground">Automate repetitive tasks and notifications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
          <Button size="sm" onClick={saveWorkflows}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{rule.name}</CardTitle>
                  <CardDescription>
                    {rule.type === 'status_transition' && 'Automatically transition entity status'}
                    {rule.type === 'email_reminder' && 'Send automated email reminders'}
                    {rule.type === 'lead_scoring' && 'Calculate lead scores based on activity'}
                    {rule.type === 'notification' && 'Send in-app notifications'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`rule-${rule.id}`}>Enabled</Label>
                  <Switch
                    id={`rule-${rule.id}`}
                    checked={rule.enabled}
                    onCheckedChange={() => toggleRule(rule.id)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {rule.type === 'status_transition' && (
                  <div className="grid gap-2">
                    <Label>Configuration</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">From Status</Label>
                        <Input value={rule.config.fromStatus} disabled className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">To Status</Label>
                        <Input value={rule.config.toStatus} disabled className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">After (days)</Label>
                        <Input type="number" value={rule.config.delayDays} disabled className="mt-1" />
                      </div>
                    </div>
                  </div>
                )}

                {rule.type === 'email_reminder' && (
                  <div className="grid gap-2">
                    <Label>Configuration</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Entity Type</Label>
                        <Input value={rule.config.entityType} disabled className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Status</Label>
                        <Input value={rule.config.status} disabled className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">After (days)</Label>
                        <Input type="number" value={rule.config.delayDays} disabled className="mt-1" />
                      </div>
                    </div>
                  </div>
                )}

                {rule.type === 'lead_scoring' && (
                  <div className="grid gap-2">
                    <Label>Score Points</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Email Opened</Label>
                        <Input type="number" value={rule.config.emailOpened} disabled className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Link Clicked</Label>
                        <Input type="number" value={rule.config.linkClicked} disabled className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Quote Requested</Label>
                        <Input type="number" value={rule.config.quoteRequested} disabled className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Order Placed</Label>
                        <Input type="number" value={rule.config.orderPlaced} disabled className="mt-1" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
