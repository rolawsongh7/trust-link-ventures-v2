
# Phase 4.2 Implementation Plan: SLA & Risk Automation (Guarded Activation Layer)

## Overview

This phase activates the automation engine built in Phase 4.1 with carefully scoped, low-risk rules focused on SLA and risk signals. All rules are created **disabled by default** and can only be enabled individually by a super_admin.

**Key Principle**: Automation as a support system, not a decision maker.

---

## Current State Analysis

### Existing Infrastructure (Phase 4.1)

| Component | Status |
|-----------|--------|
| `automation_settings` table | Exists, singleton, global toggle |
| `automation_rules` table | Exists, supports conditions/actions |
| `automation_executions` table | Exists, immutable logs |
| RPC guards (`is_automation_enabled`, `is_rule_enabled`) | Implemented |
| Kill switches (global + per-rule) | Implemented |
| Auto-disable on failure | Implemented (3 failures in 10 min) |
| Admin UI (`/admin/automation`) | Basic rules list + execution log |

### Existing SLA Infrastructure

| Component | Status |
|-----------|--------|
| `calculateSLA()` in `slaHelpers.ts` | Returns `on_track`, `at_risk`, `breached` |
| `isOrderAtRisk()` / `isOrderBreached()` | Helper functions exist |
| `SLA_THRESHOLDS` constants | Defined per order status |
| Operations Hub "At Risk" queue | Displays filtered orders |

### Existing Notification Infrastructure

| Component | Status |
|-----------|--------|
| `NotificationService.createNotification()` | Creates user notifications |
| `NotificationService.notifyAllAdmins()` | Calls `notify-admins` edge function |
| `user_notifications` table | Exists with action event support |
| `audit_logs` table | Exists with severity levels |

---

## Implementation Scope

### 1. Database Migration: Seed Automation Rules

Create 5 pre-defined automation rules, all **disabled by default**:

| Rule | Trigger | Entity | Priority |
|------|---------|--------|----------|
| SLA At-Risk Notification | `sla_at_risk` | order | 10 |
| SLA Breach Escalation | `sla_breached` | order | 5 |
| Unassigned Order Alert | `order_unassigned` | order | 20 |
| Payment Overdue Reminder | `payment_overdue` | order | 30 |
| High-Risk Customer Alert | `high_risk_customer_detected` | customer | 40 |

**SQL Structure for Each Rule**:
```sql
INSERT INTO public.automation_rules (name, description, entity_type, trigger_event, conditions, actions, enabled, priority)
VALUES (
  'SLA At-Risk Notification',
  'Notifies assigned staff and operations inbox when an order SLA is at risk',
  'order',
  'sla_at_risk',
  '{"order_status": {"not_in": ["delivered", "cancelled"]}, "sla_status": "at_risk"}'::jsonb,
  '[
    {"type": "send_notification", "config": {"target": "assigned_staff", "title": "SLA At Risk"}},
    {"type": "send_notification", "config": {"target": "operations_inbox", "title": "SLA At Risk"}},
    {"type": "log_audit_event", "config": {"event": "sla_at_risk_notified"}}
  ]'::jsonb,
  false,
  10
);
```

---

### 2. Update Automation Types & Helpers

#### Extend `TriggerEvent` Type

Add new Phase 4.2 triggers:
- `sla_at_risk`
- `order_unassigned`
- `payment_overdue`
- `high_risk_customer_detected`

#### Add Condition & Action Format Helpers

New utility functions:
- `formatConditions(conditions: Record<string, unknown>): string[]` - Human-readable condition descriptions
- `formatActions(actions: AutomationAction[]): string[]` - Human-readable action descriptions
- `isSLARelatedTrigger(trigger: string): boolean` - Identifies SLA-related executions

#### Add Audit Event Types

Extend `AuditEventType` in `auditLogger.ts`:
- `sla_at_risk_notified`
- `sla_breached_escalated`
- `order_unassigned_alerted`
- `payment_overdue_reminded`
- `high_risk_customer_alerted`

---

### 3. Add Order Flags Column (Minimal Schema Change)

Add `automation_flags` JSONB column to orders table for internal tagging:

```sql
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS automation_flags JSONB DEFAULT '{}';
```

This enables the `add_tag` action (e.g., `needs_owner`, `attention_required`) without modifying order status or financial fields.

---

### 4. Rule Detail Drawer Component

Create `AutomationRuleDetailDrawer.tsx`:

**Features**:
- Read-only view of rule details
- Trigger event with icon
- Conditions displayed as human-readable list
- Actions displayed with icons and descriptions
- Last 10 executions mini-list
- Failure count with warning indicator
- Enable/Disable toggle (super_admin only)
- "Automated - no data changed" label for SLA rules

**UI Pattern**: Uses existing `Drawer` component from `vaul`

---

### 5. Enhanced Execution Log

Update `AutomationExecutionLog.tsx`:

**New Features**:
- SLA-related execution highlighting (amber border for `sla_at_risk`, red for `sla_breached`)
- Clickable entity links (navigates to `/admin/orders/{order_id}`)
- "Automated Action" badge on SLA executions
- Filter by trigger type
- Clear "No data was modified" indicator

---

### 6. Update AutomationRulesList

Modify `AutomationRulesList.tsx`:

**New Features**:
- Click on rule row opens detail drawer
- Visual indicator for SLA rules (amber/red accent)
- Description preview on hover
- Last execution timestamp
- Phase 4.2 badge for seeded rules

---

### 7. Add Automation Execution Service

Create `src/services/automationExecutionService.ts`:

**Purpose**: Provides a clean interface for triggering automation from other parts of the app

**Key Functions**:
```typescript
class AutomationExecutionService {
  // Check if automation can run
  static async canExecute(ruleId: string): Promise<boolean>;
  
  // Log execution result (calls RPC)
  static async logExecution(params: ExecutionParams): Promise<ExecutionResult>;
  
  // Execute allowed actions
  static async executeAction(action: AutomationAction, context: ActionContext): Promise<void>;
  
  // Validate action is allowed (not forbidden)
  static isActionSafe(action: AutomationAction): boolean;
}
```

**Action Executors**:
- `send_notification`: Calls `NotificationService.notifyAllAdmins()` or creates user notification
- `log_audit_event`: Calls `AuditLogger.log()` with high severity
- `add_tag`: Updates `automation_flags` JSONB on order/customer

**Explicitly NOT Implemented**:
- `create_task`: Deferred to Phase 4.3 (requires activities table integration)
- `assign_staff`: Deferred to Phase 4.3 (requires assignment logic)

---

## File Changes Summary

### New Files (5)

| File | Purpose | Est. Lines |
|------|---------|------------|
| `supabase/migrations/[timestamp]_phase4.2_seed_rules.sql` | Seed 5 automation rules + add flags column | ~80 |
| `src/components/automation/AutomationRuleDetailDrawer.tsx` | Read-only rule detail panel | ~250 |
| `src/services/automationExecutionService.ts` | Safe action execution | ~150 |
| `src/test/phase4.2/automationRules.test.ts` | Unit tests for seeded rules | ~100 |
| `src/test/phase4.2/automationExecution.test.ts` | Unit tests for execution service | ~120 |

### Modified Files (5)

| File | Changes |
|------|---------|
| `src/utils/automationHelpers.ts` | Add new triggers, format helpers, SLA detection |
| `src/lib/auditLogger.ts` | Add 5 new SLA audit event types |
| `src/components/automation/AutomationRulesList.tsx` | Add drawer trigger, SLA highlighting |
| `src/components/automation/AutomationExecutionLog.tsx` | Add SLA highlighting, entity links, trigger filter |
| `src/hooks/useAutomation.ts` | Add useAutomationRule(id) hook for single rule fetch |

---

## Technical Implementation Details

### Seeded Rules Structure

#### Rule 1: SLA At-Risk Notification

```json
{
  "name": "SLA At-Risk Notification",
  "description": "Notifies assigned staff and operations inbox when an order SLA status becomes at_risk. No order data is modified.",
  "entity_type": "order",
  "trigger_event": "sla_at_risk",
  "conditions": {
    "sla_status": "at_risk",
    "order_status": { "not_in": ["delivered", "cancelled"] }
  },
  "actions": [
    { "type": "send_notification", "config": { "target": "assigned_staff", "title": "Order SLA At Risk", "template": "sla_at_risk" } },
    { "type": "send_notification", "config": { "target": "admin_group", "title": "Order SLA At Risk" } },
    { "type": "log_audit_event", "config": { "event_type": "sla_at_risk_notified", "severity": "medium" } }
  ],
  "priority": 10,
  "enabled": false
}
```

#### Rule 2: SLA Breach Escalation

```json
{
  "name": "SLA Breach Escalation",
  "description": "Escalates to admin group and flags order when SLA is breached. Does NOT auto-pause or change status.",
  "entity_type": "order",
  "trigger_event": "sla_breached",
  "conditions": {
    "sla_status": "breached",
    "order_status": { "not_in": ["delivered", "cancelled"] }
  },
  "actions": [
    { "type": "send_notification", "config": { "target": "assigned_staff", "title": "SLA Breached - Urgent" } },
    { "type": "send_notification", "config": { "target": "admin_group", "title": "SLA Breached - Escalation" } },
    { "type": "add_tag", "config": { "tag": "attention_required", "value": true } },
    { "type": "log_audit_event", "config": { "event_type": "sla_breached_escalated", "severity": "high" } }
  ],
  "priority": 5,
  "enabled": false
}
```

#### Rule 3: Unassigned Order Alert

```json
{
  "name": "Unassigned Order Alert",
  "description": "Alerts admins when an order has no assignee after 24 hours. Tags order for review.",
  "entity_type": "order",
  "trigger_event": "order_unassigned",
  "conditions": {
    "assigned_to": null,
    "age_hours": { "greater_than": 24 },
    "order_status": { "not_in": ["delivered", "cancelled"] }
  },
  "actions": [
    { "type": "send_notification", "config": { "target": "admin_group", "title": "Order Needs Owner" } },
    { "type": "add_tag", "config": { "tag": "needs_owner", "value": true } },
    { "type": "log_audit_event", "config": { "event_type": "order_unassigned_alerted", "severity": "medium" } }
  ],
  "priority": 20,
  "enabled": false
}
```

#### Rule 4: Payment Overdue Reminder

```json
{
  "name": "Payment Overdue Reminder (Internal)",
  "description": "Notifies finance/admin team when payment is overdue. Does NOT contact customer.",
  "entity_type": "order",
  "trigger_event": "payment_overdue",
  "conditions": {
    "payment_status": { "in": ["pending", "pending_verification"] },
    "balance_remaining": { "greater_than": 0 },
    "days_since_created": { "greater_than": 7 }
  },
  "actions": [
    { "type": "send_notification", "config": { "target": "admin_group", "title": "Payment Overdue - Follow Up Required" } },
    { "type": "log_audit_event", "config": { "event_type": "payment_overdue_reminded", "severity": "medium" } }
  ],
  "priority": 30,
  "enabled": false
}
```

#### Rule 5: High-Risk Customer Alert

```json
{
  "name": "High-Risk Customer Alert",
  "description": "Alerts admins when a customer shows high-risk indicators. Flags for credit review.",
  "entity_type": "customer",
  "trigger_event": "high_risk_customer_detected",
  "conditions": {
    "outstanding_balance": { "greater_than": 0 },
    "has_overdue_orders": true
  },
  "actions": [
    { "type": "send_notification", "config": { "target": "admin_group", "title": "High-Risk Customer - Review Required" } },
    { "type": "add_tag", "config": { "tag": "credit_review_required", "value": true } },
    { "type": "log_audit_event", "config": { "event_type": "high_risk_customer_alerted", "severity": "high" } }
  ],
  "priority": 40,
  "enabled": false
}
```

---

### Rule Detail Drawer Design

```text
+------------------------------------------+
| [X]        Rule Details                  |
+------------------------------------------+
| [Zap] SLA At-Risk Notification           |
|                                          |
| TRIGGER                                  |
| [Clock] sla_at_risk on Order             |
|                                          |
| CONDITIONS                               |
| - SLA status is "at_risk"                |
| - Order not delivered or cancelled       |
|                                          |
| ACTIONS                                  |
| [Bell] Notify assigned staff             |
| [Bell] Notify operations inbox           |
| [FileText] Log audit event               |
|                                          |
| [i] No order data is modified            |
+------------------------------------------+
| STATUS            [Disabled ◯ ○]         |
| Failures          0                      |
| Last Execution    Never                  |
+------------------------------------------+
| RECENT EXECUTIONS                        |
| (empty state or list of 10)              |
+------------------------------------------+
```

---

## Testing Requirements

### Unit Tests (Mandatory)

#### 1. Rule Validation Tests
- All 5 seeded rules exist in database
- All rules have `enabled = false`
- All rules have valid conditions/actions structure
- No rule contains forbidden actions

#### 2. Execution Service Tests
- `isActionSafe()` returns false for forbidden actions
- `send_notification` action calls correct service
- `add_tag` action updates only `automation_flags` column
- `log_audit_event` action creates audit log with high severity

#### 3. Guard Tests
- Execution blocked when global automation disabled
- Execution blocked when rule disabled
- Execution skipped for duplicate triggers (idempotency)

#### 4. UI Tests
- Drawer opens on rule click
- SLA executions have highlighting
- Entity links navigate correctly

---

## Execution Constraints (Enforced in Code)

All Phase 4.2 automations must:

1. **Execute independently** - No chained automation calls
2. **Respect global rate limits** - Check `max_executions_per_minute`
3. **Be idempotent** - Track execution in `automation_executions` to prevent duplicates
4. **Exit early if**:
   - Global automation disabled
   - Rule disabled
   - Duplicate execution detected (same rule + entity + trigger in last hour)

---

## Security Enforcement

1. **Only super_admin can enable rules** - Enforced at RPC level
2. **Admins can view but not toggle** - RLS policy unchanged
3. **Execution logs are append-only** - No UPDATE/DELETE policies
4. **Actions reuse existing permission checks** - Notifications go through `NotificationService`
5. **No RLS bypass** - All queries use authenticated context

---

## Explicitly Forbidden in Phase 4.2

| Action | Status |
|--------|--------|
| Auto-change order statuses | NOT IMPLEMENTED |
| Auto-verify payments | NOT IMPLEMENTED |
| Auto-assign credit limits | NOT IMPLEMENTED |
| Send customer-facing emails | NOT IMPLEMENTED |
| AI decision logic | NOT IMPLEMENTED |
| Chain automations | NOT IMPLEMENTED |

---

## Definition of Done

Phase 4.2 is complete when:

1. 5 SLA & risk automation rules exist but are disabled
2. Rules can be enabled individually by super_admin
3. All actions are non-destructive (notify, tag, log)
4. Staff remain fully in control
5. Rule detail drawer shows conditions/actions/executions
6. SLA-related executions are visually highlighted
7. Execution service validates action safety
8. Unit tests pass for all components
9. Manual workflows remain unaffected

---

## Future Phases (Not in 4.2)

| Feature | Phase |
|---------|-------|
| Trigger integration (actual firing) | 4.3 |
| `create_task` action implementation | 4.3 |
| `assign_staff` action implementation | 4.3 |
| Rule creation UI | 4.4 |
| Rule editing UI | 4.4 |
| Customer-facing notifications | 4.5+ |
