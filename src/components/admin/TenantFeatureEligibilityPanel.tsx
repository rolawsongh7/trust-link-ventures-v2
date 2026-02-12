// Tenant Feature Eligibility Panel
// Phase 5.5: Super Admin UI for managing per-tenant feature access

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
  Shield,
  Settings2,
  RefreshCw,
  Building2,
  FileText,
  CreditCard,
  Gift,
  Upload,
  CalendarClock,
  Receipt,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { useAllTenants, type Tenant } from '@/hooks/useTenant';
import {
  useTenantFeatureEligibility,
  useUpdateTenantFeatureEligibility,
  TENANT_FEATURE_KEYS,
  FEATURE_LABELS,
  FEATURE_DESCRIPTIONS,
  type TenantFeatureKey,
  type TenantFeatureEligibility,
} from '@/hooks/useTenantFeatureEligibility';
import { StatusPulse } from '@/components/shared/StatusPulse';
import { CreateTenantDialog } from './CreateTenantDialog';

const FEATURE_ICONS: Record<TenantFeatureKey, React.ElementType> = {
  quotes: FileText,
  credit_terms: CreditCard,
  loyalty_program: Gift,
  payment_proofs: Upload,
  standing_orders: CalendarClock,
  auto_invoicing: Receipt,
};

export function TenantFeatureEligibilityPanel() {
  const { hasSuperAdminAccess } = useRoleAuth();
  const { data: tenants, isLoading: tenantsLoading } = useAllTenants();
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (!hasSuperAdminAccess) return null;

  const handleManageFeatures = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setDialogOpen(true);
  };

  if (tenantsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Feature Eligibility
            </CardTitle>
            <Badge variant="secondary">{tenants?.length || 0} tenants</Badge>
          </div>
          <CardDescription>
            Control which features each tenant can access. Disabled features are hidden from the tenant's users.
          </CardDescription>
          <Button size="sm" className="mt-2 w-fit" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Tenant
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!tenants?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tenants found. Create a tenant first.
            </p>
          ) : (
            tenants.map((tenant) => (
              <div
                key={tenant.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                  </div>
                  <Badge
                    variant={tenant.status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {tenant.status}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleManageFeatures(tenant)}
                >
                  <Settings2 className="h-4 w-4 mr-1" />
                  Manage Features
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {selectedTenant && (
        <FeatureDialog
          tenant={selectedTenant}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelectedTenant(null);
          }}
        />
      )}

      <CreateTenantDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  );
}

function FeatureDialog({
  tenant,
  open,
  onOpenChange,
}: {
  tenant: Tenant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: eligibility, isLoading } = useTenantFeatureEligibility(tenant.id);
  const updateMutation = useUpdateTenantFeatureEligibility();
  const [pendingReasons, setPendingReasons] = useState<Record<string, string>>({});

  const getFeatureState = (key: TenantFeatureKey): TenantFeatureEligibility | undefined => {
    return eligibility?.find((e) => e.feature_key === key);
  };

  const handleToggle = async (key: TenantFeatureKey, currentlyEnabled: boolean) => {
    const reason = pendingReasons[key] || '';
    await updateMutation.mutateAsync({
      tenantId: tenant.id,
      featureKey: key,
      enabled: !currentlyEnabled,
      disabledReason: currentlyEnabled ? reason : undefined,
    });
    // Clear pending reason after save
    setPendingReasons((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {tenant.name} — Feature Access
          </DialogTitle>
          <DialogDescription>
            Toggle features on or off for this tenant. Provide a reason when disabling.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {TENANT_FEATURE_KEYS.map((key) => {
              const state = getFeatureState(key);
              const isEnabled = state?.enabled ?? true; // default enabled if no row
              const Icon = FEATURE_ICONS[key];

              return (
                <div
                  key={key}
                  className={`p-3 rounded-lg border transition-colors ${
                    isEnabled
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${isEnabled ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <Icon className={`h-4 w-4 ${isEnabled ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{FEATURE_LABELS[key]}</h4>
                          <StatusPulse status={isEnabled ? 'healthy' : 'error'} size="sm" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {FEATURE_DESCRIPTIONS[key]}
                        </p>
                        {!isEnabled && state?.disabled_reason && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            Reason: {state.disabled_reason}
                          </p>
                        )}
                        {/* Show reason input when toggling off */}
                        {isEnabled && pendingReasons[key] !== undefined && (
                          <div className="mt-2 space-y-1">
                            <Label className="text-xs">Reason for disabling</Label>
                            <Textarea
                              value={pendingReasons[key] || ''}
                              onChange={(e) =>
                                setPendingReasons((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              placeholder="Why is this being disabled?"
                              className="text-xs h-16"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => {
                        if (isEnabled) {
                          // If currently enabled and no pending reason input, show it first
                          if (pendingReasons[key] === undefined) {
                            setPendingReasons((prev) => ({ ...prev, [key]: '' }));
                            return;
                          }
                        }
                        handleToggle(key, isEnabled);
                      }}
                      disabled={updateMutation.isPending}
                    />
                  </div>
                  {/* Confirm disable button when reason is shown */}
                  {isEnabled && pendingReasons[key] !== undefined && (
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPendingReasons((prev) => {
                            const next = { ...prev };
                            delete next[key];
                            return next;
                          })
                        }
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleToggle(key, true)}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                        Confirm Disable
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <div className="flex items-start gap-2 w-full">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Changes take effect immediately. Disabled features are hidden from the tenant's users.
            </p>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
