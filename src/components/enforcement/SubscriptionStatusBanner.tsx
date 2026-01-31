// Subscription Status Banner Component
// Phase 3B: Soft enforcement warning for subscription issues

import React, { useState } from 'react';
import { X, AlertTriangle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useIsFeatureEnabled } from '@/hooks/useFeatureFlags';
import { Link } from 'react-router-dom';

export function SubscriptionStatusBanner() {
  const { subscription, isLoading } = useSubscription();
  const { enabled: enforcementEnabled } = useIsFeatureEnabled('subscription_enforcement');
  const [dismissed, setDismissed] = useState(false);

  // Don't show if loading, dismissed, or enforcement disabled
  if (isLoading || dismissed || !enforcementEnabled) {
    return null;
  }

  // Only show for problematic statuses
  if (!subscription || !['past_due', 'canceled'].includes(subscription.status)) {
    return null;
  }

  const isPastDue = subscription.status === 'past_due';
  const isCanceled = subscription.status === 'canceled';

  return (
    <div
      className={`relative px-4 py-3 ${
        isCanceled
          ? 'bg-red-500/10 border-b border-red-500/20'
          : 'bg-yellow-500/10 border-b border-yellow-500/20'
      }`}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle
            className={`h-5 w-5 ${
              isCanceled ? 'text-red-600' : 'text-yellow-600'
            }`}
          />
          <div className="text-sm">
            <span
              className={`font-medium ${
                isCanceled ? 'text-red-600' : 'text-yellow-600'
              }`}
            >
              {isCanceled
                ? 'Subscription Canceled'
                : 'Subscription Past Due'}
            </span>
            <span className="text-muted-foreground ml-2">
              {isCanceled
                ? 'Some features may be limited. Please renew your subscription.'
                : 'Your subscription payment is overdue. Please update your payment method.'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings?tab=billing">
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Billing
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
