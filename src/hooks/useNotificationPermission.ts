import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface NotificationPermissionState {
  hasAskedPermission: boolean;
  showExplanationModal: boolean;
  shouldPromptOnMount: boolean;
}

const STORAGE_KEY = 'notification_permission_asked';
const PROMPT_DELAY_MS = 3000; // Wait 3 seconds after login before showing

export function useNotificationPermission() {
  const [state, setState] = useState<NotificationPermissionState>({
    hasAskedPermission: false,
    showExplanationModal: false,
    shouldPromptOnMount: false,
  });

  const isNative = Capacitor.isNativePlatform();

  // Check on mount if we should show the prompt
  useEffect(() => {
    const hasAsked = localStorage.getItem(STORAGE_KEY);
    if (hasAsked) {
      setState((prev) => ({ ...prev, hasAskedPermission: true }));
      return;
    }

    // Only prompt on native platforms
    if (!isNative) return;

    // Delay showing the prompt
    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, shouldPromptOnMount: true }));
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isNative]);

  const showExplanation = useCallback(() => {
    if (!isNative) return;
    setState((prev) => ({ ...prev, showExplanationModal: true }));
  }, [isNative]);

  const promptForPermission = useCallback(() => {
    // Only show on native platforms and if not already asked
    const hasAsked = localStorage.getItem(STORAGE_KEY);
    if (!isNative || hasAsked) return;

    setState((prev) => ({ ...prev, showExplanationModal: true }));
  }, [isNative]);

  const onExplanationEnable = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setState((prev) => ({
      ...prev,
      showExplanationModal: false,
      hasAskedPermission: true,
      shouldPromptOnMount: false,
    }));
  }, []);

  const onExplanationSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setState((prev) => ({
      ...prev,
      showExplanationModal: false,
      hasAskedPermission: true,
      shouldPromptOnMount: false,
    }));
  }, []);

  const closeExplanationModal = useCallback(() => {
    setState((prev) => ({ ...prev, showExplanationModal: false }));
  }, []);

  return {
    ...state,
    showExplanation,
    promptForPermission,
    onExplanationEnable,
    onExplanationSkip,
    closeExplanationModal,
  };
}
