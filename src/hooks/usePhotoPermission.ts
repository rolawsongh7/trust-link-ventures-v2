import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface PhotoPermissionState {
  hasAskedPermission: boolean;
  isPermissionGranted: boolean | null;
  showExplanationModal: boolean;
}

export function usePhotoPermission() {
  const [state, setState] = useState<PhotoPermissionState>({
    hasAskedPermission: false,
    isPermissionGranted: null,
    showExplanationModal: false,
  });

  const isNative = Capacitor.isNativePlatform();

  const showExplanation = useCallback(() => {
    // On web, we don't need permission explanation
    if (!isNative) {
      setState((prev) => ({ ...prev, isPermissionGranted: true }));
      return Promise.resolve(true);
    }

    // Check if we've already asked
    const hasAsked = localStorage.getItem('photo_permission_asked');
    if (hasAsked) {
      setState((prev) => ({ ...prev, hasAskedPermission: true }));
      return Promise.resolve(true);
    }

    // Show explanation modal
    setState((prev) => ({ ...prev, showExplanationModal: true }));
    return Promise.resolve(false);
  }, [isNative]);

  const onExplanationContinue = useCallback(() => {
    localStorage.setItem('photo_permission_asked', 'true');
    setState((prev) => ({
      ...prev,
      showExplanationModal: false,
      hasAskedPermission: true,
      isPermissionGranted: true,
    }));
  }, []);

  const onExplanationDeny = useCallback(() => {
    localStorage.setItem('photo_permission_asked', 'true');
    setState((prev) => ({
      ...prev,
      showExplanationModal: false,
      hasAskedPermission: true,
      isPermissionGranted: false,
    }));
  }, []);

  const closeExplanationModal = useCallback(() => {
    setState((prev) => ({ ...prev, showExplanationModal: false }));
  }, []);

  return {
    ...state,
    showExplanation,
    onExplanationContinue,
    onExplanationDeny,
    closeExplanationModal,
  };
}
