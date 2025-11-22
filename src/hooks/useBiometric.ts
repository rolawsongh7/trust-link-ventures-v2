import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { isNativeApp } from '@/utils/env';

export interface BiometricResult {
  authenticated: boolean;
  error?: string;
}

export const useBiometric = () => {
  /**
   * Check if biometric authentication is available on the device
   */
  const isAvailable = async (): Promise<boolean> => {
    // Only available on native apps
    if (!isNativeApp()) return false;

    try {
      const result = await BiometricAuth.checkBiometry();
      return result.isAvailable;
    } catch (error) {
      console.error('[Biometric] Availability check failed:', error);
      return false;
    }
  };

  /**
   * Get the type of biometric authentication available
   */
  const getBiometricType = async (): Promise<BiometryType | null> => {
    if (!isNativeApp()) return null;

    try {
      const result = await BiometricAuth.checkBiometry();
      return result.biometryType;
    } catch (error) {
      return null;
    }
  };

  /**
   * Authenticate user with biometrics
   * @param reason - The reason shown to the user for authentication
   * @returns BiometricResult with authentication status
   */
  const authenticate = async (reason: string): Promise<BiometricResult> => {
    // Skip biometric on web - always return success
    if (!isNativeApp()) {
      return { authenticated: true };
    }

    try {
      // Check if biometric is available first
      const available = await isAvailable();
      if (!available) {
        return { 
          authenticated: true, // Continue without biometric
          error: 'Biometric not available'
        };
      }

      await BiometricAuth.authenticate({
        reason,
        cancelTitle: 'Cancel',
        allowDeviceCredential: true, // Allow passcode fallback
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'Biometric Authentication',
        androidSubtitle: reason,
        androidConfirmationRequired: false,
      });

      // If we reach here, authentication succeeded
      return {
        authenticated: true,
        error: undefined
      };
    } catch (error: any) {
      console.error('[Biometric] Authentication error:', error);
      
      // User cancelled - don't treat as error
      if (error.code === 'userCancel' || error.code === 'USER_CANCEL') {
        return {
          authenticated: false,
          error: 'Authentication cancelled by user'
        };
      }

      // For other errors, allow user to continue (graceful degradation)
      return {
        authenticated: true,
        error: 'Biometric authentication failed, proceeding without verification'
      };
    }
  };

  return {
    authenticate,
    isAvailable,
    getBiometricType
  };
};
