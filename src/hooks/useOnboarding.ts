import { useState, useMemo, useCallback, useEffect } from 'react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';
import { isPlaceholderAddress, type Address } from '@/utils/addressHelpers';

// Session storage key for "Skip for now" behavior
const SESSION_SKIP_KEY = 'onboarding_skipped_session';

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
  const { profile, refreshProfile } = useCustomerAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionSkipped, setSessionSkipped] = useState(false);

  // Check sessionStorage on mount for "Skip for now" state
  useEffect(() => {
    const skipped = sessionStorage.getItem(SESSION_SKIP_KEY) === 'true';
    setSessionSkipped(skipped);
  }, []);

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
      } else if (error) {
        console.error('Error fetching addresses:', error);
      }
      setAddressesLoaded(true);
    } catch (error) {
      console.error('Error fetching addresses for onboarding:', error);
      setAddressesLoaded(true);
    }
  }, [profile?.id]);

  // Enhanced profile completion check - includes all key fields
  const getCompletionStatus = useMemo(() => {
    const profileComplete = !!(
      profile?.full_name && 
      profile?.email &&
      profile?.company_name &&
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
    // Check session skip first (immediate, no DB needed)
    if (sessionSkipped) return false;
    
    if (!profile) return false;
    if (!addressesLoaded) return false;
    
    // FIRST check: if onboarding is completed, NEVER show again
    const onboardingCompletedAt = (profile as any).onboarding_completed_at;
    if (onboardingCompletedAt) return false;
    
    // Check if skipped recently (within 7 days) - temporary skip only
    const onboardingSkippedAt = (profile as any).onboarding_skipped_at;
    if (onboardingSkippedAt) {
      const skipDate = new Date(onboardingSkippedAt);
      const daysSinceSkip = differenceInDays(new Date(), skipDate);
      if (daysSinceSkip < 7) return false;
    }
    
    // Show if profile or address is incomplete
    const { profileComplete, addressComplete } = getCompletionStatus;
    
    // If both are complete, don't show onboarding even if not formally completed
    if (profileComplete && addressComplete) {
      return false;
    }
    
    return !profileComplete || !addressComplete;
  }, [profile, addressesLoaded, getCompletionStatus, sessionSkipped]);

  // Get the current onboarding step
  const currentStep = useMemo(() => {
    return (profile as any)?.onboarding_step || 0;
  }, [profile]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    if (!profile?.id) return;
    
    // Clear session skip flag on completion
    sessionStorage.removeItem(SESSION_SKIP_KEY);
    setSessionSkipped(false);
    
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

      if (error) {
        console.error('Error completing onboarding in DB:', error);
        // Even if DB fails, the onboarding flow can proceed
        // The user might see it again next session, but that's acceptable
      }
      
      // Refresh profile to update local state
      await refreshProfile();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, refreshProfile]);

  // Skip onboarding (permanent = true means "Don't show again")
  const skipOnboarding = useCallback(async (permanent: boolean = false) => {
    // Set session skip immediately - this works even if DB update fails
    sessionStorage.setItem(SESSION_SKIP_KEY, 'true');
    setSessionSkipped(true);
    
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

      if (error) {
        console.error('Error saving skip preference to DB:', error);
        // Session skip still works, just won't persist across sessions until DB is fixed
      }
      
      // Refresh profile to update local state
      await refreshProfile();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      // Session skip still active even if DB fails
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, refreshProfile]);

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
      
      const { error } = await supabase
        .from('customers')
        .update({ onboarding_step: step })
        .eq('id', customerId);
        
      if (error) {
        console.error('Error updating onboarding step:', error);
      }
    } catch (error) {
      console.error('Error updating onboarding step:', error);
    }
  }, [profile?.id]);

  // Refresh addresses (useful after adding a new address)
  const refreshAddresses = useCallback(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Clear session skip (for testing or reset purposes)
  const clearSessionSkip = useCallback(() => {
    sessionStorage.removeItem(SESSION_SKIP_KEY);
    setSessionSkipped(false);
  }, []);

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
    sessionSkipped,
    clearSessionSkip,
  };
};
