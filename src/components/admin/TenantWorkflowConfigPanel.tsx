// Tenant Workflow Configuration Panel
// Phase 5.4: Super admin UI to manage tenant-specific workflow settings

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2,
  Settings,
  RefreshCw,
  FileText,
  CreditCard,
  Gift,
  Receipt,
  Truck,
  Clock,
  Plus,
} from 'lucide-react';
import { useAllTenants, type Tenant } from '@/hooks/useTenant';
import { 
  useTenantWorkflowConfig, 
  useUpdateWorkflowConfig,
  type WorkflowConfig,
  DEFAULT_WORKFLOW_CONFIG,
} from '@/hooks/useWorkflowConfig';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { format } from 'date-fns';
import { CreateTenantDialog } from './CreateTenantDialog';

const CONFIG_ITEMS = [
  { key: 'quotes_enabled', label: 'Quotes', icon: FileText, description: 'Enable quote creation and management' },
  { key: 'credit_terms_enabled', label: 'Credit Terms', icon: CreditCard, description: 'Allow Net 7/14/30 payment terms' },
  { key: 'loyalty_program_enabled', label: 'Loyalty Program', icon: Gift, description: 'Enable loyalty tiers and benefits' },
  { key: 'payment_proofs_required', label: 'Payment Proofs Required', icon: Receipt, description: 'Require proof of payment uploads' },
  { key: 'auto_invoice_generation', label: 'Auto Invoicing', icon: Receipt, description: 'Generate invoices automatically' },
  { key: 'require_delivery_confirmation', label: 'Delivery Confirmation', icon: Truck, description: 'Require delivery confirmation' },
  { key: 'enable_standing_orders', label: 'Standing Orders', icon: Clock, description: 'Enable recurring order schedules' },
  { key: 'allow_partial_payments', label: 'Partial Payments', icon: CreditCard, description: 'Allow partial payment collection' },
] as const;

const NET_TERMS_OPTIONS = [
  { value: 'net_7', label: 'Net 7' },
  { value: 'net_14', label: 'Net 14' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_45', label: 'Net 45' },
  { value: 'net_60', label: 'Net 60' },
];

export function TenantWorkflowConfigPanel() {
  const { hasSuperAdminAccess } = useRoleAuth();
  const { data: tenants, isLoading: tenantsLoading } = useAllTenants();
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (!hasSuperAdminAccess) return null;

  if (tenantsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setConfigDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Tenant Workflow Configuration
          </CardTitle>
          <CardDescription>
            Configure workflow features for each tenant. Changes apply immediately.
          </CardDescription>
          <Button size="sm" className="mt-2 w-fit" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Tenant
          </Button>
        </CardHeader>
        <CardContent>
          {!tenants || tenants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tenants configured yet.</p>
              <p className="text-sm mt-2">Tenants will appear here once created.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{tenant.name}</h4>
                      <p className="text-sm text-muted-foreground">{tenant.slug}</p>
                    </div>
                    <Badge 
                      variant={tenant.status === 'active' ? 'default' : 'secondary'}
                      className="ml-2"
                    >
                      {tenant.status}
                    </Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditTenant(tenant)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      {selectedTenant && (
        <TenantConfigDialog
          tenant={selectedTenant}
          open={configDialogOpen}
          onOpenChange={(open) => {
            setConfigDialogOpen(open);
            if (!open) setSelectedTenant(null);
          }}
        />
      )}

      <CreateTenantDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  );
}

interface TenantConfigDialogProps {
  tenant: Tenant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TenantConfigDialog({ tenant, open, onOpenChange }: TenantConfigDialogProps) {
  const { data: config, isLoading } = useTenantWorkflowConfig(tenant.id);
  const updateConfig = useUpdateWorkflowConfig();
  
  const [localConfig, setLocalConfig] = useState<WorkflowConfig>(DEFAULT_WORKFLOW_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local config when data loads
  React.useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setHasChanges(false);
    }
  }, [config]);

  const handleToggle = (key: keyof WorkflowConfig, value: boolean) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleInputChange = (key: keyof WorkflowConfig, value: string | number) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateConfig.mutateAsync({
      tenantId: tenant.id,
      config: localConfig,
    });
    setHasChanges(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {tenant.name} - Workflow Configuration
          </DialogTitle>
          <DialogDescription>
            Configure which features are available for this tenant.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Feature Toggles */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Feature Toggles
              </h4>
              {CONFIG_ITEMS.map(({ key, label, icon: Icon, description }) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={localConfig[key as keyof WorkflowConfig] as boolean}
                    onCheckedChange={(checked) => handleToggle(key as keyof WorkflowConfig, checked)}
                  />
                </div>
              ))}
            </div>

            {/* Numeric Settings */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Credit Settings
              </h4>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max_credit_limit">Max Credit Limit</Label>
                  <Input
                    id="max_credit_limit"
                    type="number"
                    value={localConfig.max_credit_limit}
                    onChange={(e) => handleInputChange('max_credit_limit', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_net_terms">Default Net Terms</Label>
                  <Select
                    value={localConfig.default_net_terms}
                    onValueChange={(value) => handleInputChange('default_net_terms', value)}
                  >
                    <SelectTrigger id="default_net_terms">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NET_TERMS_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!hasChanges || updateConfig.isPending}
              >
                {updateConfig.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
