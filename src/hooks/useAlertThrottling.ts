import { useState, useCallback, useMemo } from 'react';

export interface ThrottleState {
  [insightType: string]: {
    lastShown: string;
    snoozedUntil?: string;
    showCount: number;
  };
}

export interface GroupedInsight<T> {
  type: 'single' | 'grouped';
  category: string;
  items: T[];
  count: number;
  summary?: string;
}

const STORAGE_KEY = 'analytics_alert_throttle_state';
const DEFAULT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const CUSTOMER_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_GROUP_SIZE = 3;

export function useAlertThrottling<T extends { category?: string; id?: string; urgency?: string }>(
  criticalThreshold?: number
) {
  const [throttleState, setThrottleState] = useState<ThrottleState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const saveState = useCallback((newState: ThrottleState) => {
    setThrottleState(newState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.warn('Failed to save throttle state:', e);
    }
  }, []);

  const isThrottled = useCallback((insightType: string, isCustomerRelated: boolean = false): boolean => {
    const state = throttleState[insightType];
    if (!state) return false;

    const now = Date.now();
    const lastShown = new Date(state.lastShown).getTime();
    const cooldown = isCustomerRelated ? CUSTOMER_COOLDOWN_MS : DEFAULT_COOLDOWN_MS;

    // Check if snoozed
    if (state.snoozedUntil) {
      const snoozeEnd = new Date(state.snoozedUntil).getTime();
      if (now < snoozeEnd) return true;
    }

    // Check cooldown
    return now - lastShown < cooldown;
  }, [throttleState]);

  const isCritical = useCallback((insight: T, cashAtRisk?: number): boolean => {
    // Critical alerts bypass throttling
    if (insight.urgency === 'immediate') return true;
    if (criticalThreshold && cashAtRisk && cashAtRisk > criticalThreshold) return true;
    return false;
  }, [criticalThreshold]);

  const markAsShown = useCallback((insightType: string) => {
    const newState = {
      ...throttleState,
      [insightType]: {
        lastShown: new Date().toISOString(),
        showCount: (throttleState[insightType]?.showCount || 0) + 1,
        snoozedUntil: throttleState[insightType]?.snoozedUntil
      }
    };
    saveState(newState);
  }, [throttleState, saveState]);

  const snoozeInsight = useCallback((insightType: string, hours: number = 24) => {
    const snoozeEnd = new Date(Date.now() + hours * 60 * 60 * 1000);
    const newState = {
      ...throttleState,
      [insightType]: {
        ...throttleState[insightType],
        lastShown: throttleState[insightType]?.lastShown || new Date().toISOString(),
        showCount: throttleState[insightType]?.showCount || 0,
        snoozedUntil: snoozeEnd.toISOString()
      }
    };
    saveState(newState);
  }, [throttleState, saveState]);

  const unsnoozeInsight = useCallback((insightType: string) => {
    const newState = { ...throttleState };
    if (newState[insightType]) {
      delete newState[insightType].snoozedUntil;
    }
    saveState(newState);
  }, [throttleState, saveState]);

  const getSnoozedCount = useCallback((): number => {
    const now = Date.now();
    return Object.values(throttleState).filter(state => {
      if (!state.snoozedUntil) return false;
      return new Date(state.snoozedUntil).getTime() > now;
    }).length;
  }, [throttleState]);

  const filterAndGroupInsights = useCallback((
    insights: T[],
    cashAtRisk?: number
  ): { visible: GroupedInsight<T>[]; snoozedCount: number } => {
    const snoozedCount = getSnoozedCount();
    const visible: T[] = [];
    const throttled: T[] = [];

    // Separate critical, visible, and throttled
    insights.forEach(insight => {
      const insightType = `${insight.category || 'general'}_${insight.id || 'unknown'}`;
      const isCustomerRelated = insightType.toLowerCase().includes('customer') || 
                                insightType.toLowerCase().includes('churn');

      if (isCritical(insight, cashAtRisk)) {
        visible.push(insight);
      } else if (!isThrottled(insightType, isCustomerRelated)) {
        visible.push(insight);
      } else {
        throttled.push(insight);
      }
    });

    // Group similar insights by category
    const grouped: GroupedInsight<T>[] = [];
    const categoryMap = new Map<string, T[]>();

    visible.forEach(insight => {
      const category = insight.category || 'general';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(insight);
    });

    categoryMap.forEach((items, category) => {
      if (items.length <= MAX_GROUP_SIZE) {
        // Show individually
        items.forEach(item => {
          grouped.push({
            type: 'single',
            category,
            items: [item],
            count: 1
          });
        });
      } else {
        // Group them
        const displayed = items.slice(0, MAX_GROUP_SIZE);
        const remaining = items.length - MAX_GROUP_SIZE;
        
        grouped.push({
          type: 'grouped',
          category,
          items: displayed,
          count: items.length,
          summary: `${items.length} ${category} insights (showing ${MAX_GROUP_SIZE}, +${remaining} more)`
        });
      }
    });

    return { visible: grouped, snoozedCount };
  }, [getSnoozedCount, isCritical, isThrottled]);

  const clearAllSnoozes = useCallback(() => {
    const newState: ThrottleState = {};
    Object.entries(throttleState).forEach(([key, value]) => {
      newState[key] = {
        lastShown: value.lastShown,
        showCount: value.showCount
      };
    });
    saveState(newState);
  }, [throttleState, saveState]);

  const clearAllThrottles = useCallback(() => {
    saveState({});
  }, [saveState]);

  return {
    isThrottled,
    isCritical,
    markAsShown,
    snoozeInsight,
    unsnoozeInsight,
    getSnoozedCount,
    filterAndGroupInsights,
    clearAllSnoozes,
    clearAllThrottles,
    throttleState
  };
}
