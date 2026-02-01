/**
 * Phase 4.1: Automation Foundations
 * Utility types and helpers for automation engine
 */

import { CheckCircle2, XCircle, Clock, AlertTriangle, Zap, Bell, UserPlus, Tag, FileText } from 'lucide-react';

// ============================================
// Types
// ============================================

export type TriggerEvent = 
  | 'order_created'
  | 'order_status_changed'
  | 'payment_received'
  | 'sla_breached'
  | 'sla_at_risk'
  | 'quote_created'
  | 'quote_accepted'
  | 'customer_created'
  | 'order_unassigned'
  | 'payment_overdue'
  | 'high_risk_customer_detected';

export type EntityType = 'order' | 'customer' | 'payment' | 'quote';

export type ActionType = 
  | 'send_notification'
  | 'create_task'
  | 'log_audit_event'
  | 'assign_staff'
  | 'add_tag';

export type ExecutionStatus = 'success' | 'skipped' | 'failed';

export type ConditionOperator = 
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in';

export interface AutomationCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface AutomationAction {
  type: ActionType;
  config: Record<string, unknown>;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  entity_type: EntityType;
  trigger_event: TriggerEvent;
  conditions: Record<string, unknown>;
  actions: AutomationAction[];
  enabled: boolean;
  priority: number;
  failure_count: number;
  auto_disabled_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationExecution {
  id: string;
  rule_id: string;
  entity_id: string;
  entity_type: string;
  trigger_event: string;
  status: ExecutionStatus;
  result: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
  executed_at: string;
}

export interface AutomationSettings {
  id: string;
  automation_enabled: boolean;
  max_executions_per_minute: number;
  auto_disable_threshold: number;
  auto_disable_window_minutes: number;
  updated_at: string;
  updated_by: string | null;
}

// ============================================
// Validation Constants
// ============================================

export const VALID_TRIGGER_EVENTS: TriggerEvent[] = [
  'order_created',
  'order_status_changed',
  'payment_received',
  'sla_breached',
  'sla_at_risk',
  'quote_created',
  'quote_accepted',
  'customer_created',
  'order_unassigned',
  'payment_overdue',
  'high_risk_customer_detected',
];

export const VALID_ENTITY_TYPES: EntityType[] = [
  'order',
  'customer',
  'payment',
  'quote',
];

export const ALLOWED_ACTIONS: ActionType[] = [
  'send_notification',
  'create_task',
  'log_audit_event',
  'assign_staff',
  'add_tag',
];

// Explicitly forbidden actions - never allow these
export const FORBIDDEN_ACTIONS: string[] = [
  'delete_record',
  'modify_payment',
  'modify_total',
  'cancel_order',
  'create_refund',
  'delete_customer',
  'modify_invoice',
];

// ============================================
// Validation Functions
// ============================================

/**
 * Check if a trigger event is valid
 */
export function isTriggerEventValid(event: string): event is TriggerEvent {
  return VALID_TRIGGER_EVENTS.includes(event as TriggerEvent);
}

/**
 * Check if an entity type is valid
 */
export function isEntityTypeValid(type: string): type is EntityType {
  return VALID_ENTITY_TYPES.includes(type as EntityType);
}

/**
 * Check if an action is allowed (not forbidden)
 */
export function isActionAllowed(action: string): boolean {
  if (FORBIDDEN_ACTIONS.includes(action)) {
    return false;
  }
  return ALLOWED_ACTIONS.includes(action as ActionType);
}

/**
 * Check if an action is explicitly forbidden
 */
export function isActionForbidden(action: string): boolean {
  return FORBIDDEN_ACTIONS.includes(action);
}

// ============================================
// Formatting Functions
// ============================================

/**
 * Format trigger event for display
 */
export function formatTriggerEvent(event: string): string {
  const formats: Record<string, string> = {
    'order_created': 'Order Created',
    'order_status_changed': 'Order Status Changed',
    'payment_received': 'Payment Received',
    'sla_breached': 'SLA Breached',
    'sla_at_risk': 'SLA At Risk',
    'quote_created': 'Quote Created',
    'quote_accepted': 'Quote Accepted',
    'customer_created': 'Customer Created',
    'order_unassigned': 'Order Unassigned',
    'payment_overdue': 'Payment Overdue',
    'high_risk_customer_detected': 'High Risk Customer',
  };
  return formats[event] || event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Check if trigger is SLA-related
 */
export function isSLARelatedTrigger(trigger: string): boolean {
  return trigger === 'sla_at_risk' || trigger === 'sla_breached';
}

/**
 * Get SLA highlight color classes
 */
export function getSLAHighlightColor(trigger: string): { border: string; badge: string } | null {
  if (trigger === 'sla_at_risk') {
    return {
      border: 'border-l-4 border-l-amber-500',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    };
  }
  if (trigger === 'sla_breached') {
    return {
      border: 'border-l-4 border-l-red-500',
      badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
  }
  return null;
}

/**
 * Format conditions object to human-readable strings
 */
export function formatConditions(conditions: Record<string, unknown>): string[] {
  const results: string[] = [];
  
  const formatFieldName = (field: string): string => {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatOperator = (op: string): string => {
    const ops: Record<string, string> = {
      'equals': 'equals',
      'not_equals': 'is not',
      'greater_than': 'is greater than',
      'less_than': 'is less than',
      'contains': 'contains',
      'not_contains': 'does not contain',
      'in': 'is one of',
      'not_in': 'is not one of',
    };
    return ops[op] || op;
  };

  for (const [field, value] of Object.entries(conditions)) {
    if (value === null || value === undefined) {
      results.push(`${formatFieldName(field)} is empty`);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      const op = Object.keys(obj)[0];
      const val = obj[op];
      if (Array.isArray(val)) {
        results.push(`${formatFieldName(field)} ${formatOperator(op)} [${val.join(', ')}]`);
      } else {
        results.push(`${formatFieldName(field)} ${formatOperator(op)} "${val}"`);
      }
    } else if (Array.isArray(value)) {
      results.push(`${formatFieldName(field)} is one of [${value.join(', ')}]`);
    } else {
      results.push(`${formatFieldName(field)} equals "${value}"`);
    }
  }
  
  return results.length > 0 ? results : ['No conditions (always runs)'];
}

/**
 * Format actions array to human-readable strings
 */
export function formatActions(actions: AutomationAction[]): string[] {
  if (!actions || actions.length === 0) {
    return ['No actions configured'];
  }

  return actions.map(action => {
    const baseLabel = formatActionType(action.type);
    const config = action.config || {};
    
    switch (action.type) {
      case 'send_notification':
        return config.target === 'assigned_staff' 
          ? 'Notify assigned staff'
          : config.target === 'operations_inbox'
            ? 'Notify operations inbox'
            : `Send notification to ${config.target || 'admins'}`;
      case 'create_task':
        return `Create task: "${config.title || 'Follow up'}"`;
      case 'log_audit_event':
        return `Log audit event (${config.severity || 'medium'} severity)`;
      case 'assign_staff':
        return config.strategy === 'round_robin' 
          ? 'Auto-assign staff (round robin)'
          : 'Assign to available staff';
      case 'add_tag':
        return `Add tag: "${config.tag || 'automated'}"`;
      default:
        return baseLabel;
    }
  });
}

/**
 * Format action type for display
 */
export function formatActionType(action: string): string {
  const formats: Record<string, string> = {
    'send_notification': 'Send Notification',
    'create_task': 'Create Task',
    'log_audit_event': 'Log Audit Event',
    'assign_staff': 'Assign Staff',
    'add_tag': 'Add Tag',
  };
  return formats[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format entity type for display
 */
export function formatEntityType(type: string): string {
  const formats: Record<string, string> = {
    'order': 'Order',
    'customer': 'Customer',
    'payment': 'Payment',
    'quote': 'Quote',
  };
  return formats[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

// ============================================
// Status Helpers
// ============================================

/**
 * Get color class for execution status
 */
export function getExecutionStatusColor(status: ExecutionStatus): string {
  switch (status) {
    case 'success':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'failed':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    case 'skipped':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    default:
      return 'text-muted-foreground bg-muted';
  }
}

/**
 * Get icon component for execution status
 */
export function getExecutionStatusIcon(status: ExecutionStatus) {
  switch (status) {
    case 'success':
      return CheckCircle2;
    case 'failed':
      return XCircle;
    case 'skipped':
      return Clock;
    default:
      return AlertTriangle;
  }
}

/**
 * Get icon component for action type
 */
export function getActionTypeIcon(action: ActionType) {
  switch (action) {
    case 'send_notification':
      return Bell;
    case 'create_task':
      return FileText;
    case 'assign_staff':
      return UserPlus;
    case 'add_tag':
      return Tag;
    case 'log_audit_event':
      return FileText;
    default:
      return Zap;
  }
}

/**
 * Get rule status display info
 */
export function getRuleStatusInfo(rule: AutomationRule): {
  label: string;
  color: string;
  description: string;
} {
  if (rule.auto_disabled_at) {
    return {
      label: 'Auto-Disabled',
      color: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
      description: `Disabled due to ${rule.failure_count} failures`,
    };
  }
  
  if (rule.enabled) {
    return {
      label: 'Enabled',
      color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
      description: 'Rule is active and will execute on trigger',
    };
  }
  
  return {
    label: 'Disabled',
    color: 'text-muted-foreground bg-muted',
    description: 'Rule is disabled and will not execute',
  };
}

// ============================================
// Duration Formatting
// ============================================

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return 'N/A';
  
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
