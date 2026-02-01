/**
 * Phase 4.2: Automation Execution Service
 * Provides safe action execution with validation and idempotency
 */

import { supabase } from '@/integrations/supabase/client';
import { AuditLogger, AuditEventType } from '@/lib/auditLogger';
import { NotificationService } from '@/services/notificationService';
import {
  isActionAllowed,
  isActionForbidden,
  FORBIDDEN_ACTIONS,
  type AutomationAction,
  type ActionType,
  type ExecutionStatus,
} from '@/utils/automationHelpers';

// ============================================
// Types
// ============================================

interface ActionContext {
  entityId: string;
  entityType: string;
  triggerEvent: string;
  ruleId: string;
  ruleName: string;
  userId?: string;
}

interface ActionResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

interface ExecutionParams {
  ruleId: string;
  entityId: string;
  entityType: string;
  triggerEvent: string;
  status: ExecutionStatus;
  result?: Record<string, unknown>;
  errorMessage?: string;
  durationMs?: number;
}

interface CanExecuteResult {
  canRun: boolean;
  reason?: string;
}

// ============================================
// Automation Execution Service
// ============================================

export class AutomationExecutionService {
  /**
   * Validate action is in the allowed list and not forbidden
   */
  static isActionSafe(action: AutomationAction): boolean {
    if (isActionForbidden(action.type)) {
      console.warn(`[AutomationExecution] Blocked forbidden action: ${action.type}`);
      return false;
    }
    return isActionAllowed(action.type);
  }

  /**
   * Check if automation can run (global and rule-level guards)
   */
  static async canExecute(ruleId: string): Promise<CanExecuteResult> {
    try {
      // Check global automation enabled
      const { data: isEnabled, error: enabledError } = await supabase.rpc('is_automation_enabled');
      
      if (enabledError) {
        return { canRun: false, reason: 'Failed to check automation status' };
      }
      
      if (!isEnabled) {
        return { canRun: false, reason: 'Global automation is disabled' };
      }

      // Check rule is enabled
      const { data: rule, error: ruleError } = await supabase
        .from('automation_rules')
        .select('enabled, auto_disabled_at, failure_count')
        .eq('id', ruleId)
        .single();

      if (ruleError || !rule) {
        return { canRun: false, reason: 'Rule not found' };
      }

      if (!rule.enabled) {
        return { canRun: false, reason: 'Rule is disabled' };
      }

      if (rule.auto_disabled_at) {
        return { canRun: false, reason: 'Rule was auto-disabled due to failures' };
      }

      return { canRun: true };
    } catch (error) {
      console.error('[AutomationExecution] Error checking execution guards:', error);
      return { canRun: false, reason: 'Internal error checking guards' };
    }
  }

  /**
   * Check for duplicate execution within time window (idempotency)
   */
  static async isDuplicateExecution(
    ruleId: string,
    entityId: string,
    windowMinutes: number = 60
  ): Promise<boolean> {
    try {
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('automation_executions')
        .select('id')
        .eq('rule_id', ruleId)
        .eq('entity_id', entityId)
        .eq('status', 'success')
        .gte('executed_at', windowStart)
        .limit(1);

      if (error) {
        console.error('[AutomationExecution] Error checking duplicates:', error);
        return false; // Allow execution if check fails
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('[AutomationExecution] Error in duplicate check:', error);
      return false;
    }
  }

  /**
   * Execute a single action
   */
  static async executeAction(
    action: AutomationAction,
    context: ActionContext
  ): Promise<ActionResult> {
    // Safety validation
    if (!this.isActionSafe(action)) {
      return {
        success: false,
        message: `Action "${action.type}" is not allowed`,
      };
    }

    try {
      switch (action.type) {
        case 'send_notification':
          return await this.executeSendNotification(action, context);

        case 'log_audit_event':
          return await this.executeLogAuditEvent(action, context);

        case 'add_tag':
          return await this.executeAddTag(action, context);

        case 'create_task':
          // Deferred to Phase 4.3
          return {
            success: true,
            message: 'Task creation deferred to Phase 4.3',
            data: { deferred: true },
          };

        case 'assign_staff':
          // Deferred to Phase 4.3
          return {
            success: true,
            message: 'Staff assignment deferred to Phase 4.3',
            data: { deferred: true },
          };

        default:
          return {
            success: false,
            message: `Unknown action type: ${action.type}`,
          };
      }
    } catch (error) {
      console.error(`[AutomationExecution] Error executing ${action.type}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Log execution result
   */
  static async logExecution(params: ExecutionParams): Promise<void> {
    try {
      const { error } = await supabase.from('automation_executions').insert({
        rule_id: params.ruleId,
        entity_id: params.entityId,
        entity_type: params.entityType,
        trigger_event: params.triggerEvent,
        status: params.status,
        result: params.result || null,
        error_message: params.errorMessage || null,
        duration_ms: params.durationMs || null,
      } as any);

      if (error) {
        console.error('[AutomationExecution] Failed to log execution:', error);
      }
    } catch (error) {
      console.error('[AutomationExecution] Error logging execution:', error);
    }
  }

  // ============================================
  // Action Executors
  // ============================================

  private static async executeSendNotification(
    action: AutomationAction,
    context: ActionContext
  ): Promise<ActionResult> {
    const config = action.config || {};
    const target = config.target as string || 'admins';
    const title = (config.title as string) || `Automation: ${context.ruleName}`;
    const message = (config.message as string) || `Triggered by ${context.triggerEvent} on ${context.entityType}`;

    try {
      // Use NotificationService to notify admins
      await NotificationService.notifyAllAdmins({
        type: 'system',
        title,
        message,
        metadata: {
          entity_type: context.entityType,
          entity_id: context.entityId,
          rule_id: context.ruleId,
          trigger: context.triggerEvent,
          automated: true,
        },
      });

      return {
        success: true,
        message: `Notification sent to ${target}`,
        data: { target, title },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private static async executeLogAuditEvent(
    action: AutomationAction,
    context: ActionContext
  ): Promise<ActionResult> {
    const config = action.config || {};
    const severity = (config.severity as 'low' | 'medium' | 'high') || 'medium';
    const eventType = (config.event_type as AuditEventType) || 'automation_execution_success';

    try {
      await AuditLogger.log({
        userId: context.userId,
        eventType,
        action: `Automation: ${context.ruleName}`,
        resourceType: context.entityType,
        resourceId: context.entityId,
        eventData: {
          rule_id: context.ruleId,
          trigger_event: context.triggerEvent,
          automated: true,
        },
        severity,
      });

      return {
        success: true,
        message: `Audit event logged (${severity} severity)`,
        data: { eventType, severity },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to log audit event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private static async executeAddTag(
    action: AutomationAction,
    context: ActionContext
  ): Promise<ActionResult> {
    const config = action.config || {};
    const tag = (config.tag as string) || 'automated';

    try {
      if (context.entityType === 'order') {
        // Update automation_flags on orders table
        const { data: order, error: fetchError } = await supabase
          .from('orders')
          .select('automation_flags')
          .eq('id', context.entityId)
          .single();

        if (fetchError) {
          return { success: false, message: 'Order not found' };
        }

        const currentFlags = (order?.automation_flags as Record<string, unknown>) || {};
        const tags = (currentFlags.tags as string[]) || [];
        
        if (!tags.includes(tag)) {
          tags.push(tag);
        }

        const { error: updateError } = await supabase
          .from('orders')
          .update({
            automation_flags: { ...currentFlags, tags, last_automation_at: new Date().toISOString() },
          })
          .eq('id', context.entityId);

        if (updateError) {
          return { success: false, message: 'Failed to update order flags' };
        }
      }

      return {
        success: true,
        message: `Tag "${tag}" added to ${context.entityType}`,
        data: { tag, entityType: context.entityType },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to add tag: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
