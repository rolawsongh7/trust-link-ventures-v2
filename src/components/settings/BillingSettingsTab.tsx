/**
 * Phase 3A: Billing Settings Tab
 * 
 * Super admin only - manages tenant subscription.
 * No payment processor integration in Phase 3A.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CreditCard, 
  Calendar, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Building2,
  Rocket,
  Crown
} from 'lucide-react';
import { 
  useSubscription, 
  getPlanDisplayName, 
  getStatusColor,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const PlanIcon: React.FC<{ plan: SubscriptionPlan; className?: string }> = ({ plan, className }) => {
  switch (plan) {
    case 'enterprise':
      return <Crown className={cn('h-5 w-5', className)} />;
    case 'growth':
      return <Rocket className={cn('h-5 w-5', className)} />;
    case 'starter':
    default:
      return <Building2 className={cn('h-5 w-5', className)} />;
  }
};

const StatusIcon: React.FC<{ status: SubscriptionStatus }> = ({ status }) => {
  switch (status) {
    case 'active':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'past_due':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'canceled':
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
};

const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  starter: [
    'Up to 100 orders/month',
    'Basic analytics',
    'Email support',
    '1 admin user',
  ],
  growth: [
    'Up to 1,000 orders/month',
    'Advanced analytics',
    'Priority support',
    '5 admin users',
    'Custom branding',
  ],
  enterprise: [
    'Unlimited orders',
    'Full analytics suite',
    'Dedicated support',
    'Unlimited users',
    'Custom integrations',
    'SLA guarantee',
  ],
};

export const BillingSettingsTab: React.FC = () => {
  const { user } = useAuth();
  const {
    subscription,
    isLoading,
    updatePlan,
    cancelSubscription,
    reactivateSubscription,
    createSubscription,
    isUpdating,
    isCanceling,
    isReactivating,
    isCreating,
  } = useSubscription();
  
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const handlePlanChange = async (plan: SubscriptionPlan) => {
    if (!subscription) {
      // Create new subscription
      if (user?.id) {
        await createSubscription({
          tenant_id: user.id,
          plan,
        });
      }
    } else {
      await updatePlan(subscription.id, plan);
    }
    setSelectedPlan(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Subscription</CardTitle>
                <CardDescription>Manage your platform subscription</CardDescription>
              </div>
            </div>
            {subscription && (
              <Badge 
                variant="outline" 
                className={cn('gap-1', getStatusColor(subscription.status))}
              >
                <StatusIcon status={subscription.status} />
                {subscription.status.replace('_', ' ')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-6">
              {/* Current Plan */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-3">
                  <PlanIcon plan={subscription.plan} className="text-primary" />
                  <div>
                    <p className="font-semibold text-lg">
                      {getPlanDisplayName(subscription.plan)} Plan
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Billed {subscription.billing_cycle}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Started {format(new Date(subscription.starts_at), 'MMM d, yyyy')}
                  </div>
                  {subscription.ends_at && (
                    <p className="text-sm text-red-500">
                      Ends {format(new Date(subscription.ends_at), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>

              {/* Plan Features */}
              <div>
                <h4 className="font-medium mb-2">Plan Features</h4>
                <ul className="grid gap-2 text-sm text-muted-foreground">
                  {PLAN_FEATURES[subscription.plan].map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                {/* Change Plan */}
                <Select 
                  value={selectedPlan || undefined}
                  onValueChange={(value) => setSelectedPlan(value as SubscriptionPlan)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Change plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(['starter', 'growth', 'enterprise'] as SubscriptionPlan[]).map((plan) => (
                      <SelectItem 
                        key={plan} 
                        value={plan}
                        disabled={plan === subscription.plan}
                      >
                        <div className="flex items-center gap-2">
                          <PlanIcon plan={plan} className="h-4 w-4" />
                          {getPlanDisplayName(plan)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedPlan && selectedPlan !== subscription.plan && (
                  <Button
                    onClick={() => handlePlanChange(selectedPlan)}
                    disabled={isUpdating}
                  >
                    {isUpdating && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    Confirm Change
                  </Button>
                )}

                {/* Cancel/Reactivate */}
                {subscription.status === 'active' ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-red-600 hover:text-red-700">
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will cancel your subscription. You can reactivate at any time.
                          Your access will continue until the current billing period ends.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => cancelSubscription(subscription.id)}
                          disabled={isCanceling}
                        >
                          {isCanceling ? 'Canceling...' : 'Yes, Cancel'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : subscription.status === 'canceled' ? (
                  <Button
                    variant="outline"
                    onClick={() => reactivateSubscription(subscription.id)}
                    disabled={isReactivating}
                  >
                    {isReactivating && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    Reactivate Subscription
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            /* No subscription - create one */
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Active Subscription</h3>
              <p className="text-muted-foreground mb-6">
                Choose a plan to get started
              </p>
              <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                {(['starter', 'growth', 'enterprise'] as SubscriptionPlan[]).map((plan) => (
                  <Card key={plan} className="cursor-pointer hover:border-primary transition-colors">
                    <CardHeader className="text-center pb-2">
                      <PlanIcon plan={plan} className="h-8 w-8 mx-auto text-primary mb-2" />
                      <CardTitle className="text-lg">{getPlanDisplayName(plan)}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                        {PLAN_FEATURES[plan].slice(0, 3).map((feature, i) => (
                          <li key={i}>{feature}</li>
                        ))}
                      </ul>
                      <Button
                        size="sm"
                        onClick={() => handlePlanChange(plan)}
                        disabled={isCreating}
                      >
                        Select {getPlanDisplayName(plan)}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-700 dark:text-blue-400">
                Manual Billing Mode
              </p>
              <p className="text-muted-foreground">
                Payment processor integration is not enabled. Subscription changes are 
                tracked for administrative purposes. Contact support for billing inquiries.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingSettingsTab;
