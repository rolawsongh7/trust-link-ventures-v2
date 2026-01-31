// Credit Terms Panel Component
// Phase 3B: Admin UI for managing customer credit

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CreditCard,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Ban,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useCustomerCreditTerms, useCheckCreditEligibility, useCreditTermsMutations } from '@/hooks/useCustomerCreditTerms';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { useIsFeatureEnabled } from '@/hooks/useFeatureFlags';
import {
  formatCreditAmount,
  getCreditUtilization,
  getAvailableCredit,
  getCreditStatusColor,
  getUtilizationColor,
  getUtilizationProgressColor,
  getNetTermsLabel,
  getNetTermsDescription,
  type NetTerms,
} from '@/utils/creditHelpers';

interface CreditTermsPanelProps {
  customerId: string;
  customerName?: string;
}

export function CreditTermsPanel({ customerId, customerName }: CreditTermsPanelProps) {
  const { hasSuperAdminAccess } = useRoleAuth();
  const { enabled: creditEnabled } = useIsFeatureEnabled('credit_terms_global');
  const { data: creditTerms, isLoading } = useCustomerCreditTerms(customerId);
  const { data: eligibility, isLoading: eligibilityLoading } = useCheckCreditEligibility(customerId);
  const { approveCreditTerms, suspendCreditTerms, adjustCreditLimit, reactivateCreditTerms } = useCreditTermsMutations();

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  
  const [creditLimit, setCreditLimit] = useState('5000');
  const [netTerms, setNetTerms] = useState<NetTerms>('net_14');
  const [suspendReason, setSuspendReason] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [newLimit, setNewLimit] = useState('');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const utilization = creditTerms 
    ? getCreditUtilization(creditTerms.current_balance, creditTerms.credit_limit)
    : 0;
  const available = creditTerms 
    ? getAvailableCredit(creditTerms.credit_limit, creditTerms.current_balance)
    : 0;

  const handleApprove = async () => {
    await approveCreditTerms.mutateAsync({
      customerId,
      creditLimit: parseFloat(creditLimit),
      netTerms,
    });
    setApproveDialogOpen(false);
  };

  const handleSuspend = async () => {
    await suspendCreditTerms.mutateAsync({
      customerId,
      reason: suspendReason || undefined,
    });
    setSuspendDialogOpen(false);
    setSuspendReason('');
  };

  const handleAdjustLimit = async () => {
    await adjustCreditLimit.mutateAsync({
      customerId,
      newLimit: parseFloat(newLimit),
      reason: adjustReason || undefined,
    });
    setAdjustDialogOpen(false);
    setNewLimit('');
    setAdjustReason('');
  };

  const handleReactivate = async () => {
    if (!creditTerms) return;
    await reactivateCreditTerms.mutateAsync({
      customerId,
      creditLimit: creditTerms.credit_limit,
      netTerms: creditTerms.net_terms as NetTerms,
    });
  };

  // Feature disabled state
  if (!creditEnabled) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <Ban className="h-5 w-5" />
            Credit Terms Disabled
          </CardTitle>
          <CardDescription>
            Credit terms are currently disabled globally. Contact a super admin to enable this feature.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // No credit terms yet
  if (!creditTerms) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit Terms
          </CardTitle>
          <CardDescription>
            No credit terms configured for {customerName || 'this customer'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Eligibility Check */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Credit Eligibility
            </h4>
            
            {eligibilityLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Checking eligibility...
              </div>
            ) : eligibility ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {eligibility.eligible ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Eligible
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Eligible
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    {eligibility.lifetime_orders >= 2 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>{eligibility.lifetime_orders} orders (need 2+)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {eligibility.loyalty_tier !== 'bronze' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="capitalize">{eligibility.loyalty_tier} tier (need Silver+)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!eligibility.has_overdue_invoices ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>{eligibility.has_overdue_invoices ? 'Has overdue invoices' : 'No overdue invoices'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unable to check eligibility</p>
            )}
          </div>

          {/* Approve Button */}
          {hasSuperAdminAccess && eligibility?.eligible && (
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Approve Credit Terms
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve Credit Terms</DialogTitle>
                  <DialogDescription>
                    Set credit limit and payment terms for {customerName || 'this customer'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="credit-limit">Credit Limit (GHS)</Label>
                    <Input
                      id="credit-limit"
                      type="number"
                      min="0"
                      step="100"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="5000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="net-terms">Payment Terms</Label>
                    <Select value={netTerms} onValueChange={(v) => setNetTerms(v as NetTerms)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="net_7">Net 7 - Payment due in 7 days</SelectItem>
                        <SelectItem value="net_14">Net 14 - Payment due in 14 days</SelectItem>
                        <SelectItem value="net_30">Net 30 - Payment due in 30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleApprove} 
                    disabled={approveCreditTerms.isPending || !creditLimit}
                  >
                    {approveCreditTerms.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Approve
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>
    );
  }

  // Active credit terms view
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit Terms
          </CardTitle>
          <Badge className={getCreditStatusColor(creditTerms.status)}>
            {creditTerms.status.charAt(0).toUpperCase() + creditTerms.status.slice(1)}
          </Badge>
        </div>
        <CardDescription>
          {getNetTermsLabel(creditTerms.net_terms as NetTerms)} • {getNetTermsDescription(creditTerms.net_terms as NetTerms)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Credit Limit & Balance */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Credit Limit</p>
            <p className="text-2xl font-bold">{formatCreditAmount(creditTerms.credit_limit)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Available Credit</p>
            <p className={`text-2xl font-bold ${getUtilizationColor(utilization)}`}>
              {formatCreditAmount(available)}
            </p>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Credit Utilization</span>
            <span className={getUtilizationColor(utilization)}>{utilization}%</span>
          </div>
          <Progress 
            value={utilization} 
            className="h-2"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Used: {formatCreditAmount(creditTerms.current_balance)}</span>
            <span>Limit: {formatCreditAmount(creditTerms.credit_limit)}</span>
          </div>
        </div>

        {/* Suspended Warning */}
        {creditTerms.status === 'suspended' && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-600">Credit Suspended</p>
                {creditTerms.suspended_reason && (
                  <p className="text-sm text-red-600/80 mt-1">{creditTerms.suspended_reason}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions for Super Admin */}
        {hasSuperAdminAccess && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {creditTerms.status === 'active' && (
              <>
                {/* Adjust Limit */}
                <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Adjust Limit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adjust Credit Limit</DialogTitle>
                      <DialogDescription>
                        Current limit: {formatCreditAmount(creditTerms.credit_limit)}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-limit">New Limit (GHS)</Label>
                        <Input
                          id="new-limit"
                          type="number"
                          min={creditTerms.current_balance}
                          step="100"
                          value={newLimit}
                          onChange={(e) => setNewLimit(e.target.value)}
                          placeholder={creditTerms.credit_limit.toString()}
                        />
                        <p className="text-xs text-muted-foreground">
                          Minimum: {formatCreditAmount(creditTerms.current_balance)} (current balance)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adjust-reason">Reason (optional)</Label>
                        <Textarea
                          id="adjust-reason"
                          value={adjustReason}
                          onChange={(e) => setAdjustReason(e.target.value)}
                          placeholder="Why is the limit being adjusted?"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAdjustLimit} 
                        disabled={adjustCreditLimit.isPending || !newLimit}
                      >
                        {adjustCreditLimit.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Update Limit
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Suspend */}
                <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Ban className="h-4 w-4 mr-2" />
                      Suspend
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Suspend Credit Terms</DialogTitle>
                      <DialogDescription>
                        This will immediately prevent the customer from using credit terms.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="suspend-reason">Reason</Label>
                        <Textarea
                          id="suspend-reason"
                          value={suspendReason}
                          onChange={(e) => setSuspendReason(e.target.value)}
                          placeholder="Why is credit being suspended?"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={handleSuspend} 
                        disabled={suspendCreditTerms.isPending}
                      >
                        {suspendCreditTerms.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Suspend Credit
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {creditTerms.status === 'suspended' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReactivate}
                disabled={reactivateCreditTerms.isPending}
              >
                {reactivateCreditTerms.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Reactivate
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
