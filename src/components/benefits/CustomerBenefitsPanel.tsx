// Customer Benefits Panel Component
// Phase 3B: Admin UI for managing loyalty benefits

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Gift, Ban } from 'lucide-react';
import { useCustomerBenefits, useBenefitMutations } from '@/hooks/useCustomerBenefits';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { useIsFeatureEnabled } from '@/hooks/useFeatureFlags';
import {
  getAllBenefitTypes,
  getBenefitLabel,
  getBenefitDescription,
  getBenefitIcon,
  getBenefitColor,
  hasBenefit,
  type BenefitType,
} from '@/utils/benefitHelpers';
import { format } from 'date-fns';

interface CustomerBenefitsPanelProps {
  customerId: string;
  customerName?: string;
}

export function CustomerBenefitsPanel({ customerId, customerName }: CustomerBenefitsPanelProps) {
  const { hasSuperAdminAccess } = useRoleAuth();
  const { enabled: benefitsEnabled } = useIsFeatureEnabled('loyalty_benefits_global');
  const { data: benefits, isLoading } = useCustomerBenefits(customerId);
  const { toggleBenefit, isLoading: mutating } = useBenefitMutations();

  const benefitTypes = getAllBenefitTypes();

  const handleToggle = async (benefitType: BenefitType, currentlyEnabled: boolean) => {
    await toggleBenefit.mutateAsync({
      customerId,
      benefitType,
      enabled: !currentlyEnabled,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Feature disabled state
  if (!benefitsEnabled) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <Ban className="h-5 w-5" />
            Loyalty Benefits Disabled
          </CardTitle>
          <CardDescription>
            Loyalty benefits are currently disabled globally. Contact a super admin to enable this feature.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const enabledCount = benefits?.filter(b => b.enabled).length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Loyalty Benefits
          </CardTitle>
          {enabledCount > 0 && (
            <Badge variant="secondary">
              {enabledCount} active
            </Badge>
          )}
        </div>
        <CardDescription>
          Non-monetary benefits for {customerName || 'this customer'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {benefitTypes.map((benefitType) => {
          const Icon = getBenefitIcon(benefitType);
          const isEnabled = hasBenefit(benefits || [], benefitType);
          const benefit = benefits?.find(b => b.benefit_type === benefitType);
          
          return (
            <div
              key={benefitType}
              className={`p-4 rounded-lg border transition-colors ${
                isEnabled 
                  ? 'bg-primary/5 border-primary/20' 
                  : 'bg-muted/30 border-transparent'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`h-5 w-5 ${isEnabled ? getBenefitColor(benefitType) : 'text-muted-foreground'}`} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-medium">{getBenefitLabel(benefitType)}</h4>
                    <p className="text-sm text-muted-foreground">
                      {getBenefitDescription(benefitType)}
                    </p>
                    {isEnabled && benefit?.enabled_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Enabled on {format(new Date(benefit.enabled_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                
                {hasSuperAdminAccess && (
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggle(benefitType, isEnabled)}
                    disabled={mutating}
                  />
                )}
              </div>
            </div>
          );
        })}

        {!hasSuperAdminAccess && enabledCount === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No benefits enabled for this customer
          </p>
        )}
      </CardContent>
    </Card>
  );
}
