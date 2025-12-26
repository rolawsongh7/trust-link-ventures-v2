import { useState, useMemo, useCallback } from 'react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';
import { isPlaceholderAddress, type Address } from '@/utils/addressHelpers';

export interface OnboardingState {
  shouldShowOnboarding: boolean;
  currentStep: number;
  isLoading: boolean;
  completionStatus: {
    profileComplete: boolean;
    addressComplete: boolean;
  };
}

export const useOnboarding = () => {
  const { profile } = useCustomerAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch addresses for the current customer
  const fetchAddresses = useCallback(async () => {
    if (!profile?.id) return;
    
    try {
      // Get customer_id from mapping
      const { data: customerMapping } = await supabase
        .from('customer_users')
        .select('customer_id')
        .eq('user_id', profile.id)
        .single();

      const customerId = customerMapping?.customer_id || profile.id;
      
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customerId);

      if (!error && data) {
        setAddresses(data as Address[]);
      }
      setAddressesLoaded(true);
    } catch (error) {
      console.error('Error fetching addresses for onboarding:', error);
      setAddressesLoaded(true);
    }
  }, [profile?.id]);

  // Check profile completion
  const getCompletionStatus = useMemo(() => {
    const profileComplete = !!(
      profile?.phone && 
      profile?.country && 
      profile?.industry
    );
    
    // Check for valid (non-placeholder) addresses
    const addressComplete = addresses.some(addr => !isPlaceholderAddress(addr));
    
    return { profileComplete, addressComplete };
  }, [profile, addresses]);

  // Determine if onboarding should be shown
  const shouldShowOnboarding = useMemo(() => {
    if (!profile) return false;
    if (!addressesLoaded) return false;
    
    // Check onboarding_completed_at from profile (extended fields)
    const onboardingCompletedAt = (profile as any).onboarding_completed_at;
    if (onboardingCompletedAt) return false;
    
    // Check if skipped recently (within 7 days)
    const onboardingSkippedAt = (profile as any).onboarding_skipped_at;
    if (onboardingSkippedAt) {
      const skipDate = new Date(onboardingSkippedAt);
      const daysSinceSkip = differenceInDays(new Date(), skipDate);
      if (daysSinceSkip < 7) return false;
    }
    
    // Show if profile or address is incomplete
    const { profileComplete, addressComplete } = getCompletionStatus;
    return !profileComplete || !addressComplete;
  }, [profile, addressesLoaded, getCompletionStatus]);

  // Get the current onboarding step
  const currentStep = useMemo(() => {
    return (profile as any)?.onboarding_step || 0;
  }, [profile]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    if (!profile?.id) return;
    
    setIsLoading(true);
    try {
      // Get customer_id
      const { data: customerMapping } = await supabase
        .from('customer_users')
        .select('customer_id')
        .eq('user_id', profile.id)
        .single();

      const customerId = customerMapping?.customer_id || profile.id;
      
      const { error } = await supabase
        .from('customers')
        .update({
          onboarding_completed_at: new Date().toISOString(),
          onboarding_step: 4,
        })
        .eq('id', customerId);

      if (error) throw error;
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  // Skip onboarding (permanent = true means "Don't show again")
  const skipOnboarding = useCallback(async (permanent: boolean = false) => {
    if (!profile?.id) return;
    
    setIsLoading(true);
    try {
      const { data: customerMapping } = await supabase
        .from('customer_users')
        .select('customer_id')
        .eq('user_id', profile.id)
        .single();

      const customerId = customerMapping?.customer_id || profile.id;
      
      const updateData = permanent 
        ? {
            onboarding_skipped_at: new Date().toISOString(),
            onboarding_completed_at: new Date().toISOString(),
          }
        : {
            onboarding_skipped_at: new Date().toISOString(),
          };
      
      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customerId);

      if (error) throw error;
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  // Update current step
  const updateOnboardingStep = useCallback(async (step: number) => {
    if (!profile?.id) return;
    
    try {
      const { data: customerMapping } = await supabase
        .from('customer_users')
        .select('customer_id')
        .eq('user_id', profile.id)
        .single();

      const customerId = customerMapping?.customer_id || profile.id;
      
      await supabase
        .from('customers')
        .update({ onboarding_step: step })
        .eq('id', customerId);
    } catch (error) {
      console.error('Error updating onboarding step:', error);
    }
  }, [profile?.id]);

  // Refresh addresses (useful after adding a new address)
  const refreshAddresses = useCallback(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  return {
    shouldShowOnboarding,
    currentStep,
    isLoading,
    completionStatus: getCompletionStatus,
    completeOnboarding,
    skipOnboarding,
    updateOnboardingStep,
    fetchAddresses,
    refreshAddresses,
    addressesLoaded,
  };
};
