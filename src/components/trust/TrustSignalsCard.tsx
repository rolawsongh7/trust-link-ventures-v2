/**
 * Phase 5.1: Trust Signals Card
 * 
 * Displays the behavioral signals that contribute to a customer's trust score.
 * Used in admin views to understand why a customer has a particular tier.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  RefreshCw, 
  Lock, 
  Unlock, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { TrustBadge } from './TrustBadge';
import { useCustomerTrust, useEvaluateCustomerTrust, useClearCustomerTrustOverride } from '@/hooks/useCustomerTrust';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { formatScore, getScoreColor } from '@/utils/trustHelpers';
import type { TrustTier } from '@/utils/trustHelpers';
import { cn } from '@/lib/utils';

interface TrustSignalsCardProps {
  customerId: string;
  onOverrideClick?: () => void;
}

export const TrustSignalsCard: React.FC<TrustSignalsCardProps> = ({
  customerId,
  onOverrideClick
}) => {
  const { data: trustProfile, isLoading, refetch } = useCustomerTrust(customerId);
  const evaluateMutation = useEvaluateCustomerTrust();
  const clearOverrideMutation = useClearCustomerTrustOverride();
  const { hasSuperAdminAccess } = useRoleAuth();

  const handleEvaluate = async () => {
    await evaluateMutation.mutateAsync(customerId);
    refetch();
  };

  const handleClearOverride = async () => {
    await clearOverrideMutation.mutateAsync(customerId);
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Trust & Standing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const tier = (trustProfile?.trust_tier || 'new') as TrustTier;
  const score = trustProfile?.score ?? 50;
  const hasOverride = trustProfile?.manual_override === true;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Trust & Standing
          </CardTitle>
          <TrustBadge tier={tier} hasOverride={hasOverride} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trust Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Trust Score</span>
            <span className={cn('font-semibold', getScoreColor(score))}>
              {formatScore(score)}
            </span>
          </div>
          <Progress value={score} className="h-2" />
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            {score >= 65 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : score >= 50 ? (
              <CheckCircle className="h-4 w-4 text-blue-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-amber-500" />
            )}
            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              <p className="font-medium">
                {score >= 80 ? 'Excellent' :
                 score >= 65 ? 'Good' :
                 score >= 50 ? 'Fair' :
                 score >= 30 ? 'Low' : 'At Risk'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasOverride ? (
              <Lock className="h-4 w-4 text-amber-500" />
            ) : (
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <p className="text-muted-foreground text-xs">Mode</p>
              <p className="font-medium">
                {hasOverride ? 'Manual' : 'Automatic'}
              </p>
            </div>
          </div>
        </div>

        {/* Override Info */}
        {hasOverride && trustProfile?.override_reason && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Manual Override Active</p>
                <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                  {trustProfile.override_reason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Last Evaluated */}
        {trustProfile?.last_evaluated_at && (
          <p className="text-xs text-muted-foreground">
            Last evaluated: {new Date(trustProfile.last_evaluated_at).toLocaleDateString()}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEvaluate}
            disabled={evaluateMutation.isPending || hasOverride}
            className="flex-1"
          >
            <RefreshCw className={cn(
              "h-4 w-4 mr-1",
              evaluateMutation.isPending && "animate-spin"
            )} />
            Re-evaluate
          </Button>

          {hasSuperAdminAccess && (
            <>
              {hasOverride ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearOverride}
                  disabled={clearOverrideMutation.isPending}
                  className="flex-1"
                >
                  <Unlock className="h-4 w-4 mr-1" />
                  Clear Override
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOverrideClick}
                  className="flex-1"
                >
                  <Lock className="h-4 w-4 mr-1" />
                  Override
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrustSignalsCard;
