/**
 * Phase 4.4: Automation Analytics Service
 * Provides analytics data for automation performance monitoring
 */

import { supabase } from '@/integrations/supabase/client';
import { isCustomerFacingAction } from '@/utils/automationHelpers';

// ============================================
// Types
// ============================================

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface HealthOverview {
  totalExecutions: number;
  successRate: number;
  failureRate: number;
  activeRulesCount: number;
  autoDisabledCount: number;
  healthStatus: HealthStatus;
  trend: {
    executions: number;
    successRateDelta: number;
  };
}

export interface RulePerformance {
  ruleId: string;
  ruleName: string;
  triggerEvent: string;
  entityType: string;
  enabled: boolean;
  autoDisabled: boolean;
  executions: number;
  successRate: number;
  failureRate: number;
  avgPerDay: number;
  lastRun: string | null;
  isCustomerFacing: boolean;
}

export interface DailyMetric {
  date: string;
  executions: number;
  successes: number;
  failures: number;
  skipped: number;
}

export interface SkipReason {
  reason: string;
  count: number;
}

export interface RuleDetails {
  rule: RulePerformance;
  dailyTrend: DailyMetric[];
  skipReasons: SkipReason[];
  impactMetrics: {
    entitiesAffected: number;
    customerNotificationsSent: number;
    customerNotificationsThrottled: number;
  };
}

export interface CustomerImpactMetrics {
  notificationsSent7d: number;
  notificationsSent30d: number;
  throttledCount: number;
  throttledRate: number;
  failedCount: number;
  warningsCount: number;
  warnings: string[];
}

export interface AutomationFeedback {
  id: string;
  executionId: string;
  feedbackType: 'helpful' | 'neutral' | 'harmful';
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  ruleName?: string;
}

export interface StaffTrustMetrics {
  totalFeedback: number;
  helpfulCount: number;
  neutralCount: number;
  harmfulCount: number;
  recentFeedback: AutomationFeedback[];
}

export type RuleFilter = 'all' | 'active' | 'disabled' | 'customer-facing' | 'auto-disabled';

// ============================================
// Automation Analytics Service
// ============================================

export class AutomationAnalyticsService {
  /**
   * Get health overview KPIs
   */
  static async getHealthOverview(days: number = 7): Promise<HealthOverview> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    const prevStartDate = new Date();
    prevStartDate.setDate(prevStartDate.getDate() - (days * 2));
    const prevStartDateStr = prevStartDate.toISOString();

    // Get execution stats for current period
    const { data: currentStats, error: currentError } = await supabase
      .from('automation_executions')
      .select('status')
      .gte('executed_at', startDateStr);

    if (currentError) {
      console.error('[AutomationAnalytics] Error fetching current stats:', currentError);
      throw currentError;
    }

    // Get execution stats for previous period (for trend)
    const { data: prevStats } = await supabase
      .from('automation_executions')
      .select('status')
      .gte('executed_at', prevStartDateStr)
      .lt('executed_at', startDateStr);

    // Get rule counts
    const { data: rules, error: rulesError } = await supabase
      .from('automation_rules')
      .select('enabled, auto_disabled_at');

    if (rulesError) {
      console.error('[AutomationAnalytics] Error fetching rules:', rulesError);
      throw rulesError;
    }

    const stats = currentStats || [];
    const prevStatsArr = prevStats || [];
    const rulesArr = rules || [];

    const totalExecutions = stats.length;
    const successCount = stats.filter(e => e.status === 'success').length;
    const failureCount = stats.filter(e => e.status === 'failure').length;

    const prevTotal = prevStatsArr.length;
    const prevSuccessCount = prevStatsArr.filter(e => e.status === 'success').length;

    const successRate = totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 100;
    const failureRate = totalExecutions > 0 ? (failureCount / totalExecutions) * 100 : 0;
    const prevSuccessRate = prevTotal > 0 ? (prevSuccessCount / prevTotal) * 100 : 100;

    const activeRulesCount = rulesArr.filter(r => r.enabled && !r.auto_disabled_at).length;
    const autoDisabledCount = rulesArr.filter(r => r.auto_disabled_at !== null).length;

    // Determine health status
    let healthStatus: HealthStatus = 'healthy';
    if (successRate < 80 || autoDisabledCount >= 3) {
      healthStatus = 'critical';
    } else if (successRate < 95 || autoDisabledCount >= 1) {
      healthStatus = 'warning';
    }

    return {
      totalExecutions,
      successRate: Math.round(successRate * 10) / 10,
      failureRate: Math.round(failureRate * 10) / 10,
      activeRulesCount,
      autoDisabledCount,
      healthStatus,
      trend: {
        executions: totalExecutions - prevTotal,
        successRateDelta: Math.round((successRate - prevSuccessRate) * 10) / 10,
      },
    };
  }

  /**
   * Get rule performance table data
   */
  static async getRulePerformance(
    days: number = 30,
    filter: RuleFilter = 'all'
  ): Promise<RulePerformance[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    // Fetch all rules
    const { data: rules, error: rulesError } = await supabase
      .from('automation_rules')
      .select('id, name, trigger_event, entity_type, enabled, auto_disabled_at, actions')
      .order('name');

    if (rulesError) {
      console.error('[AutomationAnalytics] Error fetching rules:', rulesError);
      throw rulesError;
    }

    // Fetch execution stats per rule
    const { data: executions, error: execError } = await supabase
      .from('automation_executions')
      .select('rule_id, status, executed_at')
      .gte('executed_at', startDateStr);

    if (execError) {
      console.error('[AutomationAnalytics] Error fetching executions:', execError);
      throw execError;
    }

    const executionsArr = executions || [];
    const rulesArr = rules || [];

    // Group executions by rule
    const execByRule = new Map<string, typeof executionsArr>();
    for (const exec of executionsArr) {
      const existing = execByRule.get(exec.rule_id) || [];
      existing.push(exec);
      execByRule.set(exec.rule_id, existing);
    }

    // Build performance data
    const performance: RulePerformance[] = rulesArr.map(rule => {
      const ruleExecs = execByRule.get(rule.id) || [];
      const total = ruleExecs.length;
      const successCount = ruleExecs.filter(e => e.status === 'success').length;
      const failureCount = ruleExecs.filter(e => e.status === 'failure').length;

      const lastExec = ruleExecs.sort((a, b) => 
        new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime()
      )[0];

      const actions = (rule.actions as any[]) || [];
      const isCustomerFacing = actions.some(a => isCustomerFacingAction(a.type));

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        triggerEvent: rule.trigger_event,
        entityType: rule.entity_type,
        enabled: rule.enabled,
        autoDisabled: rule.auto_disabled_at !== null,
        executions: total,
        successRate: total > 0 ? Math.round((successCount / total) * 100 * 10) / 10 : 0,
        failureRate: total > 0 ? Math.round((failureCount / total) * 100 * 10) / 10 : 0,
        avgPerDay: Math.round((total / days) * 10) / 10,
        lastRun: lastExec?.executed_at || null,
        isCustomerFacing,
      };
    });

    // Apply filter
    switch (filter) {
      case 'active':
        return performance.filter(r => r.enabled && !r.autoDisabled);
      case 'disabled':
        return performance.filter(r => !r.enabled);
      case 'auto-disabled':
        return performance.filter(r => r.autoDisabled);
      case 'customer-facing':
        return performance.filter(r => r.isCustomerFacing);
      default:
        return performance;
    }
  }

  /**
   * Get detailed metrics for a single rule
   */
  static async getRuleDetails(ruleId: string, days: number = 30): Promise<RuleDetails | null> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    // Fetch rule
    const { data: rule, error: ruleError } = await supabase
      .from('automation_rules')
      .select('id, name, trigger_event, entity_type, enabled, auto_disabled_at, actions')
      .eq('id', ruleId)
      .single();

    if (ruleError || !rule) {
      console.error('[AutomationAnalytics] Error fetching rule:', ruleError);
      return null;
    }

    // Fetch executions
    const { data: executions, error: execError } = await supabase
      .from('automation_executions')
      .select('status, executed_at, entity_id, result, error_message')
      .eq('rule_id', ruleId)
      .gte('executed_at', startDateStr)
      .order('executed_at', { ascending: true });

    if (execError) {
      console.error('[AutomationAnalytics] Error fetching executions:', execError);
      throw execError;
    }

    const executionsArr = executions || [];
    const actions = (rule.actions as any[]) || [];
    const isCustomerFacing = actions.some(a => isCustomerFacingAction(a.type));

    // Build daily trend
    const dailyMap = new Map<string, DailyMetric>();
    for (const exec of executionsArr) {
      const dateKey = exec.executed_at.split('T')[0];
      const existing = dailyMap.get(dateKey) || {
        date: dateKey,
        executions: 0,
        successes: 0,
        failures: 0,
        skipped: 0,
      };
      existing.executions++;
      if (exec.status === 'success') existing.successes++;
      if (exec.status === 'failure') existing.failures++;
      if (exec.status === 'skipped') existing.skipped++;
      dailyMap.set(dateKey, existing);
    }
    const dailyTrend = Array.from(dailyMap.values());

    // Build skip reasons
    const skipReasonMap = new Map<string, number>();
    for (const exec of executionsArr.filter(e => e.status === 'skipped')) {
      const result = exec.result as Record<string, unknown> | null;
      const reason = (result?.reason as string) || exec.error_message || 'Unknown';
      skipReasonMap.set(reason, (skipReasonMap.get(reason) || 0) + 1);
    }
    const skipReasons: SkipReason[] = Array.from(skipReasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate impact metrics
    const uniqueEntities = new Set(executionsArr.map(e => e.entity_id)).size;
    let customerNotificationsSent = 0;
    let customerNotificationsThrottled = 0;
    for (const exec of executionsArr) {
      const result = exec.result as Record<string, unknown> | null;
      if (result?.customerNotified === true) customerNotificationsSent++;
      if (result?.throttled === true) customerNotificationsThrottled++;
    }

    const total = executionsArr.length;
    const successCount = executionsArr.filter(e => e.status === 'success').length;
    const failureCount = executionsArr.filter(e => e.status === 'failure').length;

    const lastExec = executionsArr[executionsArr.length - 1];

    return {
      rule: {
        ruleId: rule.id,
        ruleName: rule.name,
        triggerEvent: rule.trigger_event,
        entityType: rule.entity_type,
        enabled: rule.enabled,
        autoDisabled: rule.auto_disabled_at !== null,
        executions: total,
        successRate: total > 0 ? Math.round((successCount / total) * 100 * 10) / 10 : 0,
        failureRate: total > 0 ? Math.round((failureCount / total) * 100 * 10) / 10 : 0,
        avgPerDay: Math.round((total / days) * 10) / 10,
        lastRun: lastExec?.executed_at || null,
        isCustomerFacing,
      },
      dailyTrend,
      skipReasons,
      impactMetrics: {
        entitiesAffected: uniqueEntities,
        customerNotificationsSent,
        customerNotificationsThrottled,
      },
    };
  }

  /**
   * Get customer-facing automation impact metrics
   */
  static async getCustomerImpactMetrics(days: number = 7): Promise<CustomerImpactMetrics> {
    const startDate7d = new Date();
    startDate7d.setDate(startDate7d.getDate() - 7);
    const startDate30d = new Date();
    startDate30d.setDate(startDate30d.getDate() - 30);

    // Fetch customer-facing rules
    const { data: rules } = await supabase
      .from('automation_rules')
      .select('id, actions');

    const rulesArr = rules || [];
    const customerFacingRuleIds = rulesArr
      .filter(r => {
        const actions = (r.actions as any[]) || [];
        return actions.some(a => isCustomerFacingAction(a.type));
      })
      .map(r => r.id);

    if (customerFacingRuleIds.length === 0) {
      return {
        notificationsSent7d: 0,
        notificationsSent30d: 0,
        throttledCount: 0,
        throttledRate: 0,
        failedCount: 0,
        warningsCount: 0,
        warnings: [],
      };
    }

    // Fetch executions for customer-facing rules (30d)
    const { data: executions } = await supabase
      .from('automation_executions')
      .select('rule_id, status, executed_at, result, entity_id')
      .in('rule_id', customerFacingRuleIds)
      .gte('executed_at', startDate30d.toISOString());

    const executionsArr = executions || [];
    const executions7d = executionsArr.filter(
      e => new Date(e.executed_at) >= startDate7d
    );

    // Calculate metrics
    let notificationsSent7d = 0;
    let notificationsSent30d = 0;
    let throttledCount = 0;
    let failedCount = 0;

    for (const exec of executionsArr) {
      const result = exec.result as Record<string, unknown> | null;
      const is7d = new Date(exec.executed_at) >= startDate7d;

      if (result?.customerNotified === true) {
        notificationsSent30d++;
        if (is7d) notificationsSent7d++;
      }
      if (result?.throttled === true) {
        throttledCount++;
      }
      if (exec.status === 'failure') {
        failedCount++;
      }
    }

    const totalAttempts = executionsArr.length;
    const throttledRate = totalAttempts > 0 
      ? Math.round((throttledCount / totalAttempts) * 100 * 10) / 10 
      : 0;

    // Generate warnings
    const warnings: string[] = [];
    
    // High volume warning (>50/day average)
    const avgPerDay = notificationsSent7d / 7;
    if (avgPerDay > 50) {
      warnings.push(`High notification volume: ${Math.round(avgPerDay)} notifications/day on average`);
    }

    // Repeated notifications to same entity
    const entityNotificationCounts = new Map<string, number>();
    for (const exec of executions7d) {
      const result = exec.result as Record<string, unknown> | null;
      if (result?.customerNotified === true) {
        const count = entityNotificationCounts.get(exec.entity_id) || 0;
        entityNotificationCounts.set(exec.entity_id, count + 1);
      }
    }
    const repeatedEntities = Array.from(entityNotificationCounts.values())
      .filter(count => count > 2).length;
    if (repeatedEntities > 0) {
      warnings.push(`${repeatedEntities} customers received 3+ notifications in 7 days`);
    }

    // Failed deliveries
    if (failedCount > 0) {
      warnings.push(`${failedCount} notification failures in last 30 days`);
    }

    return {
      notificationsSent7d,
      notificationsSent30d,
      throttledCount,
      throttledRate,
      failedCount,
      warningsCount: warnings.length,
      warnings,
    };
  }

  /**
   * Get staff trust metrics (feedback summary)
   */
  static async getStaffTrustMetrics(days: number = 30): Promise<StaffTrustMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    const { data: feedback, error } = await supabase
      .from('automation_feedback')
      .select(`
        id,
        execution_id,
        feedback_type,
        notes,
        created_by,
        created_at
      `)
      .gte('created_at', startDateStr)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[AutomationAnalytics] Error fetching feedback:', error);
      throw error;
    }

    const feedbackArr = feedback || [];

    const helpfulCount = feedbackArr.filter(f => f.feedback_type === 'helpful').length;
    const neutralCount = feedbackArr.filter(f => f.feedback_type === 'neutral').length;
    const harmfulCount = feedbackArr.filter(f => f.feedback_type === 'harmful').length;

    return {
      totalFeedback: feedbackArr.length,
      helpfulCount,
      neutralCount,
      harmfulCount,
      recentFeedback: feedbackArr.slice(0, 10).map(f => ({
        id: f.id,
        executionId: f.execution_id,
        feedbackType: f.feedback_type as 'helpful' | 'neutral' | 'harmful',
        notes: f.notes,
        createdBy: f.created_by,
        createdAt: f.created_at,
      })),
    };
  }

  /**
   * Submit feedback for an execution
   */
  static async submitFeedback(
    executionId: string,
    feedbackType: 'helpful' | 'neutral' | 'harmful',
    notes?: string
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('automation_feedback').insert({
      execution_id: executionId,
      feedback_type: feedbackType,
      notes: notes || null,
      created_by: user?.id || null,
    });

    if (error) {
      console.error('[AutomationAnalytics] Error submitting feedback:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics (last 24h) for live dashboard
   */
  static async getRealTimeMetrics(): Promise<{
    last24h: { executions: number; successRate: number };
    lastHour: { executions: number; failures: number };
  }> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const { data: last24hData } = await supabase
      .from('automation_executions')
      .select('status')
      .gte('executed_at', yesterday.toISOString());

    const { data: lastHourData } = await supabase
      .from('automation_executions')
      .select('status')
      .gte('executed_at', lastHour.toISOString());

    const last24hArr = last24hData || [];
    const lastHourArr = lastHourData || [];

    const last24hSuccesses = last24hArr.filter(e => e.status === 'success').length;
    const lastHourFailures = lastHourArr.filter(e => e.status === 'failure').length;

    return {
      last24h: {
        executions: last24hArr.length,
        successRate: last24hArr.length > 0 
          ? Math.round((last24hSuccesses / last24hArr.length) * 100) 
          : 100,
      },
      lastHour: {
        executions: lastHourArr.length,
        failures: lastHourFailures,
      },
    };
  }
}
