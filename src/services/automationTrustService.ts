/**
 * Phase 4.4: Automation Trust Service
 * Implements auto-degrade logic and trust controls
 */

import { supabase } from '@/integrations/supabase/client';
import { AuditLogger } from '@/lib/auditLogger';
import { NotificationService } from '@/services/notificationService';

// ============================================
// Types
// ============================================

export interface DegradeConfig {
  /** Failure rate threshold (0-1) to trigger auto-disable. Default: 0.30 (30%) */
  failureThreshold: number;
  /** Minimum executions needed before evaluating. Default: 10 */
  minExecutionsForEval: number;
  /** Max executions per entity per day before flagging. Default: 3 */
  maxExecutionsPerEntity: number;
  /** Number of "harmful" feedback to trigger review. Default: 3 in 7 days */
  harmfulFeedbackThreshold: number;
  /** Hours to look back for failure rate. Default: 24 */
  failureWindowHours: number;
  /** Days to look back for feedback. Default: 7 */
  feedbackWindowDays: number;
}

export interface TrustEvaluation {
  shouldDegrade: boolean;
  reason?: string;
  metrics: {
    failureRate24h: number;
    executions24h: number;
    maxEntityExecutions: number;
    harmfulFeedbackCount: number;
  };
}

// ============================================
// Automation Trust Service
// ============================================

export class AutomationTrustService {
  static readonly DEFAULT_CONFIG: DegradeConfig = {
    failureThreshold: 0.30,
    minExecutionsForEval: 10,
    maxExecutionsPerEntity: 3,
    harmfulFeedbackThreshold: 3,
    failureWindowHours: 24,
    feedbackWindowDays: 7,
  };

  /**
   * Evaluate if a rule should be auto-disabled based on trust metrics
   */
  static async evaluateRuleTrust(
    ruleId: string,
    config: Partial<DegradeConfig> = {}
  ): Promise<TrustEvaluation> {
    const cfg: DegradeConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    const failureWindowStart = new Date(
      Date.now() - cfg.failureWindowHours * 60 * 60 * 1000
    ).toISOString();
    
    const feedbackWindowStart = new Date(
      Date.now() - cfg.feedbackWindowDays * 24 * 60 * 60 * 1000
    ).toISOString();

    // Get recent executions
    const { data: executions, error: execError } = await supabase
      .from('automation_executions')
      .select('status, entity_id')
      .eq('rule_id', ruleId)
      .gte('executed_at', failureWindowStart);

    if (execError) {
      console.error('[AutomationTrust] Error fetching executions:', execError);
      return {
        shouldDegrade: false,
        metrics: {
          failureRate24h: 0,
          executions24h: 0,
          maxEntityExecutions: 0,
          harmfulFeedbackCount: 0,
        },
      };
    }

    const executionsArr = executions || [];
    const totalExecutions = executionsArr.length;
    const failureCount = executionsArr.filter(e => e.status === 'failure').length;
    const failureRate = totalExecutions > 0 ? failureCount / totalExecutions : 0;

    // Count executions per entity
    const entityCounts = new Map<string, number>();
    for (const exec of executionsArr) {
      entityCounts.set(exec.entity_id, (entityCounts.get(exec.entity_id) || 0) + 1);
    }
    const maxEntityExecutions = Math.max(...Array.from(entityCounts.values()), 0);

    // Get harmful feedback count
    const { data: feedback } = await supabase
      .from('automation_feedback')
      .select('id')
      .eq('feedback_type', 'harmful')
      .gte('created_at', feedbackWindowStart);

    // Filter feedback for this rule's executions
    const { data: ruleExecutionIds } = await supabase
      .from('automation_executions')
      .select('id')
      .eq('rule_id', ruleId)
      .gte('executed_at', feedbackWindowStart);

    const ruleExecIds = new Set((ruleExecutionIds || []).map(e => e.id));
    
    // Get harmful feedback for this rule
    const { data: ruleFeedback } = await supabase
      .from('automation_feedback')
      .select('execution_id')
      .eq('feedback_type', 'harmful')
      .gte('created_at', feedbackWindowStart);

    const harmfulFeedbackCount = (ruleFeedback || [])
      .filter(f => ruleExecIds.has(f.execution_id))
      .length;

    const metrics = {
      failureRate24h: Math.round(failureRate * 100) / 100,
      executions24h: totalExecutions,
      maxEntityExecutions,
      harmfulFeedbackCount,
    };

    // Evaluate degradation conditions
    // Condition 1: High failure rate with sufficient samples
    if (totalExecutions >= cfg.minExecutionsForEval && failureRate > cfg.failureThreshold) {
      return {
        shouldDegrade: true,
        reason: `High failure rate: ${Math.round(failureRate * 100)}% in last ${cfg.failureWindowHours}h (threshold: ${cfg.failureThreshold * 100}%)`,
        metrics,
      };
    }

    // Condition 2: Entity spam (same entity triggered too many times)
    if (maxEntityExecutions > cfg.maxExecutionsPerEntity) {
      return {
        shouldDegrade: true,
        reason: `Entity spam detected: ${maxEntityExecutions} executions for same entity in ${cfg.failureWindowHours}h (max: ${cfg.maxExecutionsPerEntity})`,
        metrics,
      };
    }

    // Condition 3: Too much harmful feedback
    if (harmfulFeedbackCount >= cfg.harmfulFeedbackThreshold) {
      return {
        shouldDegrade: true,
        reason: `Negative feedback threshold reached: ${harmfulFeedbackCount} harmful ratings in ${cfg.feedbackWindowDays} days`,
        metrics,
      };
    }

    return {
      shouldDegrade: false,
      metrics,
    };
  }

  /**
   * Auto-disable a rule with full audit trail
   */
  static async degradeRule(ruleId: string, reason: string): Promise<void> {
    // Update rule to disabled with auto_disabled_at timestamp
    const { error: updateError } = await supabase
      .from('automation_rules')
      .update({
        enabled: false,
        auto_disabled_at: new Date().toISOString(),
      })
      .eq('id', ruleId);

    if (updateError) {
      console.error('[AutomationTrust] Error disabling rule:', updateError);
      throw updateError;
    }

    // Get rule name for logging
    const { data: rule } = await supabase
      .from('automation_rules')
      .select('name')
      .eq('id', ruleId)
      .single();

    const ruleName = rule?.name || 'Unknown Rule';

    // Log audit event
    await AuditLogger.log({
      eventType: 'automation_rule_auto_disabled',
      action: `Rule "${ruleName}" auto-disabled`,
      resourceType: 'automation_rule',
      resourceId: ruleId,
      eventData: {
        rule_name: ruleName,
        reason,
        auto_degraded: true,
      },
      severity: 'high',
    });

    // Notify super admins
    await this.notifyDegradation(ruleId, ruleName, reason);

    console.log(`[AutomationTrust] Rule "${ruleName}" auto-disabled: ${reason}`);
  }

  /**
   * Notify super_admins about rule degradation
   */
  static async notifyDegradation(
    ruleId: string,
    ruleName: string,
    reason: string
  ): Promise<void> {
    try {
      await NotificationService.notifyAllAdmins({
        type: 'system',
        title: 'Automation Rule Auto-Disabled',
        message: `Rule "${ruleName}" was automatically disabled due to: ${reason}`,
        metadata: {
          rule_id: ruleId,
          rule_name: ruleName,
          reason,
          auto_disabled: true,
          action_required: 'Review rule performance and re-enable if appropriate',
        },
      });
    } catch (error) {
      console.error('[AutomationTrust] Error sending degradation notification:', error);
    }
  }

  /**
   * Check trust status after each execution and potentially degrade
   * Called from automationExecutionService after logging a failure
   */
  static async checkPostExecution(ruleId: string): Promise<void> {
    try {
      // Check if rule is already disabled
      const { data: rule } = await supabase
        .from('automation_rules')
        .select('enabled, auto_disabled_at')
        .eq('id', ruleId)
        .single();

      if (!rule || !rule.enabled || rule.auto_disabled_at) {
        return; // Already disabled, skip evaluation
      }

      // Evaluate trust
      const evaluation = await this.evaluateRuleTrust(ruleId);

      if (evaluation.shouldDegrade && evaluation.reason) {
        await this.degradeRule(ruleId, evaluation.reason);
      }
    } catch (error) {
      console.error('[AutomationTrust] Error in post-execution check:', error);
      // Don't throw - this is a background check
    }
  }

  /**
   * Manually re-enable an auto-disabled rule (super_admin only)
   */
  static async reenableRule(ruleId: string): Promise<void> {
    const { error } = await supabase
      .from('automation_rules')
      .update({
        enabled: true,
        auto_disabled_at: null,
        failure_count: 0, // Reset failure count
      })
      .eq('id', ruleId);

    if (error) {
      console.error('[AutomationTrust] Error re-enabling rule:', error);
      throw error;
    }

    // Get rule name for audit
    const { data: rule } = await supabase
      .from('automation_rules')
      .select('name')
      .eq('id', ruleId)
      .single();

    await AuditLogger.log({
      eventType: 'automation_rule_enabled',
      action: `Rule "${rule?.name || 'Unknown'}" manually re-enabled`,
      resourceType: 'automation_rule',
      resourceId: ruleId,
      eventData: {
        rule_name: rule?.name,
        manually_reenabled: true,
      },
      severity: 'medium',
    });
  }

  /**
   * Get trust status for a specific rule
   */
  static async getRuleTrustStatus(ruleId: string): Promise<{
    isHealthy: boolean;
    evaluation: TrustEvaluation;
    warnings: string[];
  }> {
    const evaluation = await this.evaluateRuleTrust(ruleId);
    
    const warnings: string[] = [];
    
    // Add warnings for concerning metrics (even if below threshold)
    if (evaluation.metrics.failureRate24h > 0.15) {
      warnings.push(`Elevated failure rate: ${Math.round(evaluation.metrics.failureRate24h * 100)}%`);
    }
    if (evaluation.metrics.maxEntityExecutions > 2) {
      warnings.push(`Frequent triggers on same entity: ${evaluation.metrics.maxEntityExecutions} times`);
    }
    if (evaluation.metrics.harmfulFeedbackCount > 0) {
      warnings.push(`Received ${evaluation.metrics.harmfulFeedbackCount} harmful feedback`);
    }

    return {
      isHealthy: !evaluation.shouldDegrade && warnings.length === 0,
      evaluation,
      warnings,
    };
  }
}
