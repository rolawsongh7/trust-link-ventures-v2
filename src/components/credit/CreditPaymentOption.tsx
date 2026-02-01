// Credit Payment Option Component
// Phase 5.2: Customer payment selection for credit-eligible orders

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioGroupItem, RadioGroup } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { 
  useCustomerCreditTerms, 
  useCheckCreditEligibility,
  useOrderCreditMutations,
} from '@/hooks/useCustomerCreditTerms';
import { 
  formatCreditAmount, 
  getAvailableCredit, 
  getNetTermsLabel,
  getNetTermsDays,
  canCoverWithCredit,
  type NetTerms,
} from '@/utils/creditHelpers';
import { cn } from '@/lib/utils';

interface CreditPaymentOptionProps {
  customerId: string;
  orderTotal: number;
  selectedPaymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  orderId?: string; // If provided, can apply credit immediately
  disabled?: boolean;
}

export function CreditPaymentOption({
  customerId,
  orderTotal,
  selectedPaymentMethod,
  onPaymentMethodChange,
  orderId,
  disabled = false,
}: CreditPaymentOptionProps) {
  const { data: creditTerms, isLoading: termsLoading } = useCustomerCreditTerms(customerId);
  const { data: eligibility, isLoading: eligibilityLoading } = useCheckCreditEligibility(customerId);
  const { applyCreditToOrder } = useOrderCreditMutations();

  const isLoading = termsLoading || eligibilityLoading;

  if (isLoading) {
    return (
      <Card className="p-4 border-dashed">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Checking credit eligibility...</span>
        </div>
      </Card>
    );
  }

  // No credit terms or not active
  if (!creditTerms || creditTerms.status !== 'active') {
    return null;
  }

  // Check eligibility
  const isEligible = eligibility?.eligible ?? false;
  const hasOverdueCredit = eligibility?.has_overdue_credit ?? false;
  const availableCredit = getAvailableCredit(creditTerms.credit_limit, creditTerms.current_balance);
  const canCover = canCoverWithCredit(orderTotal, creditTerms);
  const canUseCredit = isEligible && !hasOverdueCredit && canCover;

  const netTerms = creditTerms.net_terms as NetTerms;
  const dueDays = getNetTermsDays(netTerms);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);

  const handleApplyCredit = async () => {
    if (!orderId) return;
    await applyCreditToOrder.mutateAsync({ orderId });
  };

  return (
    <Card className={cn(
      "p-4 transition-all",
      selectedPaymentMethod === 'credit' && canUseCredit 
        ? "border-primary ring-1 ring-primary" 
        : "border-border",
      !canUseCredit && "opacity-60"
    )}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              canUseCredit ? "bg-primary/10" : "bg-muted"
            )}>
              <CreditCard className={cn(
                "h-5 w-5",
                canUseCredit ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label className={cn(
                  "font-medium",
                  !canUseCredit && "text-muted-foreground"
                )}>
                  Pay on Credit
                </Label>
                <Badge variant="outline" className="text-xs">
                  {getNetTermsLabel(netTerms)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Payment due by {dueDate.toLocaleDateString()}
              </p>
            </div>
          </div>

          {canUseCredit ? (
            <RadioGroup
              value={selectedPaymentMethod}
              onValueChange={onPaymentMethodChange}
            >
              <RadioGroupItem
                value="credit"
                id="payment-credit"
                disabled={disabled || !canUseCredit}
              />
            </RadioGroup>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Not Available
            </Badge>
          )}
        </div>

        {/* Credit Info */}
        <div className="pl-12 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Available Credit</span>
            <span className={cn(
              "font-medium",
              availableCredit >= orderTotal ? "text-green-600" : "text-amber-600"
            )}>
              {formatCreditAmount(availableCredit)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Order Total</span>
            <span className="font-medium">{formatCreditAmount(orderTotal)}</span>
          </div>

          {/* Status Messages */}
          {canUseCredit && (
            <div className="flex items-center gap-2 text-xs text-green-600 mt-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>You can use credit for this order</span>
            </div>
          )}

          {!canCover && availableCredit > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-600 mt-2">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>
                Insufficient credit. Need {formatCreditAmount(orderTotal - availableCredit)} more.
              </span>
            </div>
          )}

          {hasOverdueCredit && (
            <div className="flex items-center gap-2 text-xs text-red-600 mt-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Credit blocked due to overdue balance</span>
            </div>
          )}

          {!isEligible && !hasOverdueCredit && eligibility?.missing_requirements && (
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              {eligibility.missing_requirements.map((req, i) => (
                <div key={i} className="flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  <span>{req}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trust Tier Indicator */}
        {eligibility?.trust_tier && (
          <div className="pl-12 pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="capitalize">{eligibility.trust_tier} Trust Tier</span>
            </div>
          </div>
        )}

        {/* Apply Credit Button (if order already exists) */}
        {orderId && selectedPaymentMethod === 'credit' && canUseCredit && (
          <div className="pl-12 pt-2">
            <Button
              size="sm"
              onClick={handleApplyCredit}
              disabled={applyCreditToOrder.isPending || disabled}
            >
              {applyCreditToOrder.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Apply Credit Terms
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Simplified credit option for displaying in payment method lists
 */
export function CreditPaymentOptionCompact({
  customerId,
  orderTotal,
}: {
  customerId: string;
  orderTotal: number;
}) {
  const { data: creditTerms, isLoading } = useCustomerCreditTerms(customerId);
  const { data: eligibility } = useCheckCreditEligibility(customerId);

  if (isLoading || !creditTerms || creditTerms.status !== 'active') {
    return null;
  }

  const availableCredit = getAvailableCredit(creditTerms.credit_limit, creditTerms.current_balance);
  const canCover = canCoverWithCredit(orderTotal, creditTerms);
  const isEligible = eligibility?.eligible ?? false;
  const hasOverdueCredit = eligibility?.has_overdue_credit ?? false;

  return {
    value: 'credit',
    label: `Pay on Credit (${getNetTermsLabel(creditTerms.net_terms as NetTerms)})`,
    description: `Available: ${formatCreditAmount(availableCredit)}`,
    disabled: !isEligible || hasOverdueCredit || !canCover,
    disabledReason: !canCover 
      ? 'Insufficient credit' 
      : hasOverdueCredit 
        ? 'Overdue balance' 
        : !isEligible 
          ? 'Not eligible' 
          : undefined,
  };
}
