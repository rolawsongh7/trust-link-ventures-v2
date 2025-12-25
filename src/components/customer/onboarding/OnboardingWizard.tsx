import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { OnboardingProgress } from './OnboardingProgress';
import { WelcomeStep } from './steps/WelcomeStep';
import { ProfileStep } from './steps/ProfileStep';
import { AddressStep } from './steps/AddressStep';
import { TourStep } from './steps/TourStep';
import { AnimatePresence } from 'framer-motion';

const TOTAL_STEPS = 4;

export const OnboardingWizard: React.FC = () => {
  const { profile } = useCustomerAuth();
  const { 
    shouldShowOnboarding, 
    currentStep: savedStep,
    completeOnboarding, 
    skipOnboarding,
    updateOnboardingStep,
    fetchAddresses,
    refreshAddresses,
    addressesLoaded,
    completionStatus,
  } = useOnboarding();

  const [step, setStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch addresses when wizard opens
  useEffect(() => {
    if (profile?.id && !addressesLoaded) {
      fetchAddresses();
    }
  }, [profile?.id, fetchAddresses, addressesLoaded]);

  // Determine if wizard should be shown
  useEffect(() => {
    if (addressesLoaded && shouldShowOnboarding) {
      // Determine starting step based on completion
      let startStep = savedStep || 0;
      
      // Skip profile step if already complete
      if (startStep === 1 && completionStatus.profileComplete) {
        startStep = 2;
      }
      // Skip address step if already complete
      if (startStep === 2 && completionStatus.addressComplete) {
        startStep = 3;
      }
      
      setStep(startStep);
      setIsOpen(true);
    } else if (addressesLoaded && !shouldShowOnboarding) {
      setIsOpen(false);
    }
  }, [shouldShowOnboarding, addressesLoaded, savedStep, completionStatus]);

  const handleNext = () => {
    const nextStep = step + 1;
    setStep(nextStep);
    updateOnboardingStep(nextStep);
  };

  const handleBack = () => {
    const prevStep = Math.max(0, step - 1);
    setStep(prevStep);
    updateOnboardingStep(prevStep);
  };

  const handleSkip = async () => {
    await skipOnboarding();
    setIsOpen(false);
  };

  const handleComplete = async () => {
    await completeOnboarding();
    setIsOpen(false);
  };

  const handleAddressAdded = () => {
    refreshAddresses();
  };

  // Don't render if not ready
  if (!addressesLoaded || !profile) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleSkip();
      }
    }}>
      <DialogContent 
        className="sm:max-w-md p-0 gap-0 max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Progress indicator */}
        <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} />
        
        {/* Step content */}
        <div className="min-h-[350px] pb-6">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <WelcomeStep
                key="welcome"
                userName={profile?.full_name?.split(' ')[0]}
                onNext={handleNext}
                onSkip={handleSkip}
              />
            )}
            {step === 1 && (
              <ProfileStep
                key="profile"
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {step === 2 && (
              <AddressStep
                key="address"
                onNext={handleNext}
                onBack={handleBack}
                onAddressAdded={handleAddressAdded}
              />
            )}
            {step === 3 && (
              <TourStep
                key="tour"
                onComplete={handleComplete}
                onBack={handleBack}
              />
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
