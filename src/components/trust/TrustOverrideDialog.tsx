/**
 * Phase 5.1: Trust Override Dialog
 * 
 * Allows super admins to manually override a customer's trust tier.
 * Requires a mandatory reason.
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Lock } from 'lucide-react';
import { useOverrideCustomerTrust } from '@/hooks/useCustomerTrust';
import { TrustBadge } from './TrustBadge';
import type { TrustTier } from '@/utils/trustHelpers';
import { TRUST_TIER_CONFIG } from '@/utils/trustHelpers';

const overrideSchema = z.object({
  newTier: z.enum(['new', 'verified', 'trusted', 'preferred', 'restricted']),
  reason: z.string().min(10, 'Reason must be at least 10 characters')
});

type OverrideFormData = z.infer<typeof overrideSchema>;

interface TrustOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  currentTier: TrustTier;
}

export const TrustOverrideDialog: React.FC<TrustOverrideDialogProps> = ({
  open,
  onOpenChange,
  customerId,
  customerName,
  currentTier,
}) => {
  const overrideMutation = useOverrideCustomerTrust();

  const form = useForm<OverrideFormData>({
    resolver: zodResolver(overrideSchema),
    defaultValues: {
      newTier: currentTier,
      reason: ''
    }
  });

  const onSubmit = async (data: OverrideFormData) => {
    await overrideMutation.mutateAsync({
      customerId,
      newTier: data.newTier as TrustTier,
      reason: data.reason
    });
    form.reset();
    onOpenChange(false);
  };

  const selectedTier = form.watch('newTier') as TrustTier;
  const isRestricting = selectedTier === 'restricted' && currentTier !== 'restricted';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Override Trust Tier
          </DialogTitle>
          <DialogDescription>
            Manually set the trust tier for <strong>{customerName}</strong>.
            This action is logged and requires a reason.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Current tier:</span>
              <TrustBadge tier={currentTier} showTooltip={false} />
            </div>

            <FormField
              control={form.control}
              name="newTier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Trust Tier</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(TRUST_TIER_CONFIG) as TrustTier[]).map((tier) => (
                        <SelectItem key={tier} value={tier}>
                          <div className="flex items-center gap-2">
                            <TrustBadge tier={tier} variant="compact" showTooltip={false} />
                            <span>{TRUST_TIER_CONFIG[tier].label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {TRUST_TIER_CONFIG[selectedTier]?.description}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isRestricting && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Restricting this customer</p>
                  <p className="text-muted-foreground">
                    This will limit the customer to upfront payment only.
                  </p>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Override *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain why this override is necessary..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This reason will be logged for audit purposes.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={overrideMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={overrideMutation.isPending}
                variant={isRestricting ? 'destructive' : 'default'}
              >
                {overrideMutation.isPending ? 'Overriding...' : 'Override Tier'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TrustOverrideDialog;
