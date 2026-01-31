

# Phase 4.1 Implementation Plan: Automation Foundations

## Executive Summary

This plan implements a **safe, deterministic, reversible automation engine** that is **off by default**, fully auditable, and immediately killable. The engine provides infrastructure only - no behavior changes occur unless explicitly enabled by a super_admin.

---

## Current State Analysis

### Existing Patterns to Follow

| Pattern | Source | Reuse Strategy |
|---------|--------|----------------|
| Feature Flags & Kill Switches | `system_feature_flags` table | Extend with `automation_global` flag |
| RLS with super_admin guards | Phase 3B migrations | Same pattern for automation tables |
| Audit Logging | `AuditLogger` class | Add automation event types |
| Admin UI Tabs | `SuperAdminTab.tsx` | Add Automation tab |
| Hook patterns | `useFeatureFlags.ts` | Create `useAutomation.ts` |
| RPC function guards | `approve_credit_terms()` | Same pattern for automation RPCs |

### Key Infrastructure Available

| Component | Status | Usage |
|-----------|--------|-------|
| `audit_logs` table | Exists | Log all automation events |
| `user_roles` table | Exists | super_admin/admin checks |
| `useRoleAuth` hook | Exists | UI access control |
| `KillSwitchPanel` pattern | Exists | Global automation toggle |

---

## Implementation Scope

### Database Schema (3 New Tables)

#### Table 1: `automation_rules`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | NOT NULL |
| `description` | text | Nullable |
| `entity_type` | text | CHECK: 'order', 'customer', 'payment', 'quote' |
| `trigger_event` | text | NOT NULL |
| `conditions` | jsonb | DEFAULT '{}' |
| `actions` | jsonb | DEFAULT '[]' |
| `enabled` | boolean | DEFAULT false |
| `priority` | integer | DEFAULT 100 |
| `failure_count` | integer | DEFAULT 0 |
| `auto_disabled_at` | timestamptz | Nullable (auto-disable tracking) |
| `created_by` | uuid | FK to auth.users |
| `created_at` | timestamptz | DEFAULT now() |
| `updated_at` | timestamptz | Auto-updated |

#### Table 2: `automation_executions`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `rule_id` | uuid | FK to automation_rules |
| `entity_id` | uuid | NOT NULL |
| `entity_type` | text | NOT NULL |
| `trigger_event` | text | NOT NULL |
| `status` | text | CHECK: 'success', 'skipped', 'failed' |
| `result` | jsonb | Action results |
| `error_message` | text | Nullable |
| `duration_ms` | integer | Execution time |
| `executed_at` | timestamptz | DEFAULT now() |

#### Table 3: `automation_settings`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `automation_enabled` | boolean | DEFAULT false |
| `max_executions_per_minute` | integer | DEFAULT 30 |
| `auto_disable_threshold` | integer | DEFAULT 3 (failures) |
| `auto_disable_window_minutes` | integer | DEFAULT 10 |
| `updated_at` | timestamptz | Auto-updated |
| `updated_by` | uuid | FK to auth.users |

---

### RLS Policies

```text
automation_rules:
  - super_admin: ALL operations
  - admin: SELECT only
  - others: denied

automation_executions:
  - super_admin: ALL operations  
  - admin: SELECT only
  - others: denied

automation_settings:
  - super_admin: ALL operations
  - admin: SELECT only
  - others: denied
```

---

### RPC Functions (Database Level)

#### 1. `is_automation_enabled()`
Returns boolean - checks global automation toggle.

#### 2. `is_rule_enabled(p_rule_id uuid)`
Returns boolean - checks specific rule status AND global toggle.

#### 3. `toggle_automation_global(p_enabled boolean, p_reason text)`
Super_admin only. Toggles global automation. Logs to audit_logs.

#### 4. `toggle_automation_rule(p_rule_id uuid, p_enabled boolean)`
Super_admin only. Toggles specific rule. Logs to audit_logs.

#### 5. `log_automation_execution(p_rule_id, p_entity_id, p_entity_type, p_trigger_event, p_status, p_result, p_error_message, p_duration_ms)`
Creates immutable execution log. Increments failure_count if failed. Auto-disables rule if threshold exceeded.

#### 6. `reset_rule_failure_count(p_rule_id uuid)`
Super_admin only. Resets failure count after fixing issues.

---

### Trigger Events (Phase 4.1)

| Event | Entity Type | When Fired |
|-------|-------------|------------|
| `order_created` | order | New order inserted |
| `order_status_changed` | order | Status column updated |
| `payment_received` | payment | Payment record created |
| `sla_breached` | order | SLA status becomes 'breached' |

These are NOT implemented as database triggers in Phase 4.1 - they are documented trigger points for Phase 4.2+.

---

### Allowed Actions (Phase 4.1)

| Action Type | Description | Side Effects |
|-------------|-------------|--------------|
| `send_notification` | Creates in-app notification | Inserts into notifications table |
| `create_task` | Creates internal task | Inserts into activities table |
| `log_audit_event` | Logs custom audit event | Inserts into audit_logs |
| `assign_staff` | Assigns staff to entity | Updates assigned_to column |
| `add_tag` | Adds tag/flag to entity | Updates metadata jsonb |

#### Explicitly Forbidden Actions
- `delete_record` - Cannot delete any data
- `modify_payment` - Cannot change payment amounts
- `modify_total` - Cannot change order totals
- `cancel_order` - Cannot cancel orders automatically
- `create_refund` - Cannot create refunds

---

## Frontend Implementation

### New Files

#### 1. Utility: `src/utils/automationHelpers.ts`

```text
Types:
- TriggerEvent
- ActionType  
- AutomationRule
- AutomationExecution
- AutomationSettings
- ConditionOperator

Functions:
- isTriggerEventValid(event) → boolean
- isActionAllowed(action) → boolean
- formatTriggerEvent(event) → string
- formatActionType(action) → string
- getExecutionStatusColor(status) → string
- getExecutionStatusIcon(status) → IconComponent
```

#### 2. Hook: `src/hooks/useAutomation.ts`

```text
Exports:
- useAutomationSettings() → { settings, isLoading, refetch }
- useAutomationRules() → { rules, isLoading, refetch }
- useAutomationExecutions(ruleId?) → { executions, isLoading }
- useIsAutomationEnabled() → { enabled, isLoading }
- useAutomationMutations() → { 
    toggleGlobal, 
    toggleRule, 
    resetFailureCount,
    isLoading 
  }
```

#### 3. Component: `src/components/automation/AutomationStatusCard.tsx`

Features:
- Global automation ON/OFF status
- Big toggle switch (super_admin only)
- Warning banner when ON
- Last updated timestamp
- Throttle limit display

#### 4. Component: `src/components/automation/AutomationRulesList.tsx`

Features:
- List of all automation rules
- Status badge per rule (Enabled/Disabled/Auto-Disabled)
- Trigger event display
- Last execution status
- Failure count indicator
- View-only in Phase 4.1 (no edit UI)

#### 5. Component: `src/components/automation/AutomationExecutionLog.tsx`

Features:
- Paginated execution history
- Filter by rule, status, date
- Expandable row for result details
- Error message display
- Duration display

#### 6. Component: `src/components/automation/AutomationKillSwitch.tsx`

Features:
- Emergency OFF button
- Confirmation dialog
- Reason input
- Instant disable (no loading)

#### 7. Page: `src/pages/admin/AutomationControl.tsx`

Sections:
1. **Status Card** - Global ON/OFF with warning
2. **Rules List** - All rules (read-only)  
3. **Execution Log** - Recent executions
4. **Kill Switch** - Emergency controls

---

### Route Integration

Add to admin routes in `App.tsx`:

```text
/admin/automation → AutomationControl.tsx
```

Protected by `AdminProtectedRoute` with super_admin check.

---

### Settings Integration

Add to `SuperAdminTab.tsx`:

```text
New Tab: "Automation"
Icon: Zap
Content: AutomationStatusCard + Quick Kill Switch
Link to full page: /admin/automation
```

---

## Audit Event Types

Extend `AuditEventType` in `auditLogger.ts`:

```text
New Types:
- 'automation_global_enabled'
- 'automation_global_disabled'  
- 'automation_rule_enabled'
- 'automation_rule_disabled'
- 'automation_rule_auto_disabled'
- 'automation_execution_success'
- 'automation_execution_failed'
- 'automation_failure_reset'
```

All automation events logged with severity = 'high'.

---

## Safety Mechanisms

### 1. Global Kill Switch
- Single toggle disables ALL automation
- Instant effect (no cache)
- Requires super_admin
- Logged with reason

### 2. Per-Rule Enable/Disable
- Individual rule control
- Disabled by default on creation
- Logged to audit trail

### 3. Auto-Disable on Failure
- Rule disabled if > 3 failures in 10 minutes
- `auto_disabled_at` timestamp recorded
- Requires manual reset by super_admin
- Logged as 'automation_rule_auto_disabled'

### 4. Rate Limiting
- Max 30 executions per minute (configurable)
- Excess executions skipped and logged
- Prevents runaway automation

### 5. Execution Isolation
- Each rule executes independently
- One rule failure doesn't affect others
- All executions logged

---

## Testing Requirements

### Unit Tests (`src/test/phase4.1/`)

#### `automationHelpers.test.ts`
- isTriggerEventValid returns true for valid events
- isTriggerEventValid returns false for invalid events
- isActionAllowed returns true for allowed actions
- isActionAllowed returns false for forbidden actions
- Forbidden actions list includes all dangerous operations

#### `automationSecurity.test.ts`
- Global toggle requires super_admin
- Rule toggle requires super_admin
- Admin can only read, not write
- Execution log is immutable

#### `automationSafety.test.ts`
- Auto-disable triggers after threshold failures
- Rate limiting prevents excess executions
- Global disable stops all automation
- Rule disable stops specific automation

---

## Files Summary

### New Files (9)

| File | Lines (est.) | Purpose |
|------|--------------|---------|
| `supabase/migrations/phase4.1_automation.sql` | ~200 | Tables, RLS, RPCs |
| `src/utils/automationHelpers.ts` | ~100 | Types & utilities |
| `src/hooks/useAutomation.ts` | ~150 | Data hooks |
| `src/components/automation/AutomationStatusCard.tsx` | ~120 | Status display |
| `src/components/automation/AutomationRulesList.tsx` | ~200 | Rules list |
| `src/components/automation/AutomationExecutionLog.tsx` | ~180 | Execution history |
| `src/components/automation/AutomationKillSwitch.tsx` | ~100 | Emergency controls |
| `src/pages/admin/AutomationControl.tsx` | ~150 | Main page |
| `src/test/phase4.1/automation.test.ts` | ~150 | Test suite |

### Modified Files (4)

| File | Changes |
|------|---------|
| `src/lib/auditLogger.ts` | Add automation event types |
| `src/App.tsx` | Add /admin/automation route |
| `src/components/settings/SuperAdminTab.tsx` | Add Automation quick access |
| `src/integrations/supabase/types.ts` | Auto-generated type updates |

---

## Migration SQL Preview

```sql
-- automation_settings with singleton pattern
CREATE TABLE public.automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_enabled BOOLEAN NOT NULL DEFAULT false,
  max_executions_per_minute INTEGER NOT NULL DEFAULT 30,
  auto_disable_threshold INTEGER NOT NULL DEFAULT 3,
  auto_disable_window_minutes INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert single settings row
INSERT INTO public.automation_settings (id) VALUES (gen_random_uuid());

-- Constraint to ensure only one row
CREATE UNIQUE INDEX automation_settings_singleton ON public.automation_settings ((true));
```

---

## Definition of Done

Phase 4.1 is complete when:

1. Automation tables exist with proper RLS
2. Global kill switch works instantly
3. Per-rule toggle works
4. Auto-disable on failure works
5. Execution logging is immutable
6. Admin UI shows all controls (read-only for rules)
7. All automation is OFF by default
8. No existing logic is altered
9. Manual workflows remain primary
10. All actions are audit-logged

---

## Explicit Non-Goals

| Feature | Status |
|---------|--------|
| Rule creation UI | NOT IN 4.1 (4.2+) |
| Rule editing UI | NOT IN 4.1 (4.2+) |
| Actual trigger execution | NOT IN 4.1 (4.2+) |
| AI decision-making | NOT IN 4.1 |
| Customer-facing automation | NOT IN 4.1 |
| Default enabled rules | NOT IN 4.1 |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Accidental automation | Disabled by default, requires super_admin |
| Runaway execution | Rate limiting + auto-disable |
| Silent failures | All executions logged |
| Data corruption | Forbidden actions enforced at RPC level |
| Audit bypass | Logging in same transaction as action |

