// Kill Switch Panel Component
// Phase 3B: Super Admin controls for global feature toggles

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Power,
  RefreshCw,
  Shield,
  CreditCard,
  Gift,
  FileText,
} from 'lucide-react';
import { useFeatureFlags, useFeatureFlagMutations, getFeatureLabel, getFeatureDescription, type FeatureKey } from '@/hooks/useFeatureFlags';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { format } from 'date-fns';

const FEATURE_ICONS: Record<FeatureKey, React.ElementType> = {
  credit_terms_global: CreditCard,
  subscription_enforcement: FileText,
  loyalty_benefits_global: Gift,
};

export function KillSwitchPanel() {
  const { hasSuperAdminAccess } = useRoleAuth();
  const { data: flags, isLoading } = useFeatureFlags();
  const { toggleFlag, isLoading: mutating } = useFeatureFlagMutations();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    featureKey: FeatureKey | null;
    enabling: boolean;
  }>({ open: false, featureKey: null, enabling: false });
  const [disableReason, setDisableReason] = useState('');

  if (!hasSuperAdminAccess) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const handleToggleRequest = (featureKey: FeatureKey, currentlyEnabled: boolean) => {
    if (currentlyEnabled) {
      // Disabling requires confirmation
      setConfirmDialog({ open: true, featureKey, enabling: false });
    } else {
      // Enabling can be done directly
      toggleFlag.mutateAsync({ featureKey, enabled: true });
    }
  };

  const handleConfirmDisable = async () => {
    if (!confirmDialog.featureKey) return;
    
    await toggleFlag.mutateAsync({
      featureKey: confirmDialog.featureKey,
      enabled: false,
      reason: disableReason || undefined,
    });
    
    setConfirmDialog({ open: false, featureKey: null, enabling: false });
    setDisableReason('');
  };

  const disabledCount = flags?.filter(f => !f.enabled).length || 0;

  return (
    <>
      <Card className="border-red-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Power className="h-5 w-5 text-red-500" />
              Kill Switches
            </CardTitle>
            {disabledCount > 0 && (
              <Badge variant="destructive">
                {disabledCount} disabled
              </Badge>
            )}
          </div>
          <CardDescription>
            Emergency controls to disable financial features globally. All toggles are audit-logged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {flags?.map((flag) => {
            const Icon = FEATURE_ICONS[flag.feature_key as FeatureKey] || Shield;
            
            return (
              <div
                key={flag.id}
                className={`p-4 rounded-lg border transition-colors ${
                  flag.enabled 
                    ? 'bg-green-500/5 border-green-500/20' 
                    : 'bg-red-500/5 border-red-500/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${flag.enabled ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <Icon className={`h-5 w-5 ${flag.enabled ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{getFeatureLabel(flag.feature_key as FeatureKey)}</h4>
                        <Badge 
                          variant={flag.enabled ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {flag.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getFeatureDescription(flag.feature_key as FeatureKey)}
                      </p>
                      {!flag.enabled && flag.disabled_at && (
                        <div className="mt-2 p-2 rounded bg-red-500/10 text-sm">
                          <p className="text-red-600 dark:text-red-400">
                            Disabled on {format(new Date(flag.disabled_at), 'MMM d, yyyy HH:mm')}
                          </p>
                          {flag.disabled_reason && (
                            <p className="text-red-600/80 dark:text-red-400/80 mt-1">
                              Reason: {flag.disabled_reason}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={() => handleToggleRequest(flag.feature_key as FeatureKey, flag.enabled)}
                    disabled={mutating}
                  />
                </div>
              </div>
            );
          })}

          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-600">High-Impact Controls</p>
                <p className="text-yellow-600/80 mt-1">
                  Disabling these features will immediately affect all customers with active credit terms or benefits.
                  All changes are logged with high severity.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, featureKey: null, enabling: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Disable Feature
            </DialogTitle>
            <DialogDescription>
              This will immediately disable {confirmDialog.featureKey ? getFeatureLabel(confirmDialog.featureKey) : 'this feature'} for all customers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disable-reason">Reason for disabling</Label>
              <Textarea
                id="disable-reason"
                value={disableReason}
                onChange={(e) => setDisableReason(e.target.value)}
                placeholder="Why is this feature being disabled?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, featureKey: null, enabling: false })}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmDisable}
              disabled={mutating}
            >
              {mutating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Disable Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
