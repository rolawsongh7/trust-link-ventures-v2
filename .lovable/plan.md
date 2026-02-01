
# Phase 4.2 Completion Plan: SLA & Risk Automation

## Summary

Complete the remaining Phase 4.2 implementation by adding TypeScript types, format helpers, the AutomationRuleDetailDrawer component, the automationExecutionService, and enhanced UI components with SLA highlighting.

---

## Current State

**Already Complete:**
- Database migration with 5 seeded automation rules (all disabled by default)
- `automation_flags` JSONB column added to orders table
- Basic automation hooks and components from Phase 4.1

**Missing (to implement):**
1. Extended `TriggerEvent` types (4 new triggers)
2. Extended `AuditEventType` (5 new SLA events)
3. Format helper functions (`formatConditions`, `formatActions`, `isSLARelatedTrigger`)
4. `useAutomationRule(id)` hook for single rule fetch
5. `AutomationRuleDetailDrawer` component
6. `automationExecutionService` for safe action execution
7. Enhanced UI with SLA highlighting and entity links

---

## Implementation Details

### 1. Update automationHelpers.ts

**Extend TriggerEvent type:**
Add `sla_at_risk`, `order_unassigned`, `payment_overdue`, `high_risk_customer_detected`

**Add new helper functions:**
- `formatConditions(conditions)` - Converts condition JSON to human-readable strings (e.g., "Order not delivered or cancelled")
- `formatActions(actions)` - Converts action array to readable descriptions (e.g., "Notify assigned staff")
- `isSLARelatedTrigger(trigger)` - Returns true for `sla_at_risk`, `sla_breached`
- `getSLAHighlightColor(trigger)` - Returns amber for at_risk, red for breached

**Update VALID_TRIGGER_EVENTS and formatTriggerEvent:**
Include all Phase 4.2 triggers in the validation arrays and display formatters

---

### 2. Update auditLogger.ts

**Add 5 new SLA audit event types:**
- `sla_at_risk_notified`
- `sla_breached_escalated`
- `order_unassigned_alerted`
- `payment_overdue_reminded`
- `high_risk_customer_alerted`

---

### 3. Update useAutomation.ts

**Add `useAutomationRule(ruleId)` hook:**
- Fetches a single rule by ID
- Includes the last 10 executions for that rule
- Used by the detail drawer component

**Add query key:**
- `rule: (id: string) => ['automation', 'rule', id]`

---

### 4. Create AutomationRuleDetailDrawer Component

**Location:** `src/components/automation/AutomationRuleDetailDrawer.tsx`

**UI Structure:**
```text
+------------------------------------------+
| [X]        Rule Details                  |
+------------------------------------------+
| [Zap] SLA At-Risk Notification           |
| "Notifies assigned staff when..."        |
+------------------------------------------+
| TRIGGER                                  |
| [Clock] sla_at_risk on Order             |
+------------------------------------------+
| CONDITIONS                               |
| - SLA status is "at_risk"                |
| - Order not delivered or cancelled       |
+------------------------------------------+
| ACTIONS                                  |
| [Bell] Notify assigned staff             |
| [Bell] Notify operations inbox           |
| [FileText] Log audit event               |
+------------------------------------------+
| [Info] No order data is modified         |
+------------------------------------------+
| STATUS            [Toggle Switch]        |
| Failures          0                      |
| Last Execution    Never                  |
+------------------------------------------+
| RECENT EXECUTIONS (Last 10)              |
| (list or empty state)                    |
+------------------------------------------+
```

**Features:**
- Uses Sheet component (slides in from right)
- Read-only view of rule configuration
- Human-readable conditions and actions
- Enable/Disable toggle (super_admin only)
- "No data modified" label for SLA rules
- Mini execution log showing last 10 runs

---

### 5. Create automationExecutionService.ts

**Location:** `src/services/automationExecutionService.ts`

**Purpose:** Provides a clean interface for executing automation actions safely

**Key Functions:**

```typescript
class AutomationExecutionService {
  // Validate action is in allowed list
  static isActionSafe(action: AutomationAction): boolean;
  
  // Check if automation can run (guards)
  static async canExecute(ruleId: string): Promise<{
    canRun: boolean;
    reason?: string;
  }>;
  
  // Check for duplicate execution (idempotency)
  static async isDuplicateExecution(
    ruleId: string, 
    entityId: string, 
    windowMinutes?: number
  ): Promise<boolean>;
  
  // Execute a single action
  static async executeAction(
    action: AutomationAction, 
    context: ActionContext
  ): Promise<ActionResult>;
  
  // Log execution result
  static async logExecution(params: ExecutionParams): Promise<void>;
}
```

**Action Executors (Phase 4.2):**
- `send_notification` - Calls NotificationService.notifyAllAdmins()
- `log_audit_event` - Calls AuditLogger.log() with configured severity
- `add_tag` - Updates automation_flags JSONB on orders/customers table

**Deferred to Phase 4.3:**
- `create_task` - Requires activities table integration
- `assign_staff` - Requires assignment logic

**Safety Constraints:**
- Validates against FORBIDDEN_ACTIONS list
- Checks global automation enabled flag
- Checks individual rule enabled flag
- Prevents duplicate executions within 1 hour

---

### 6. Enhance AutomationRulesList.tsx

**Changes:**
- Add click handler to open detail drawer
- Add visual indicator for SLA rules (amber/red left border)
- Show rule description on hover via tooltip
- Add "Phase 4.2" badge for seeded rules
- Pass selected rule to drawer component

---

### 7. Enhance AutomationExecutionLog.tsx

**Changes:**
- Add SLA-related execution highlighting:
  - Amber border for `sla_at_risk` trigger
  - Red border for `sla_breached` trigger
- Add clickable entity links (navigate to `/admin/orders/{id}`)
- Add "Automated Action" badge on SLA executions
- Add trigger type filter dropdown
- Add "No data was modified" indicator for read-only actions
- Show Phase 4.2 badge for seeded rule executions

---

### 8. Update AutomationControl.tsx

**Changes:**
- Update Phase notice from "4.1" to "4.2 Active"
- Add summary of seeded rules count
- Show which rules are enabled vs disabled

---

## File Changes Summary

### New Files (2)

| File | Purpose |
|------|---------|
| `src/components/automation/AutomationRuleDetailDrawer.tsx` | Rule detail panel with conditions/actions/executions |
| `src/services/automationExecutionService.ts` | Safe action execution service |

### Modified Files (6)

| File | Changes |
|------|---------|
| `src/utils/automationHelpers.ts` | Add 4 triggers, format helpers, SLA detection |
| `src/lib/auditLogger.ts` | Add 5 new SLA audit event types |
| `src/hooks/useAutomation.ts` | Add useAutomationRule(id) hook |
| `src/components/automation/AutomationRulesList.tsx` | Add drawer trigger, SLA highlighting |
| `src/components/automation/AutomationExecutionLog.tsx` | Add SLA highlighting, entity links |
| `src/pages/admin/AutomationControl.tsx` | Update phase notice, add rule summary |

---

## Technical Specifications

### formatConditions Implementation

```typescript
function formatConditions(conditions: Record<string, unknown>): string[] {
  const results: string[] = [];
  
  for (const [field, value] of Object.entries(conditions)) {
    if (value === null) {
      results.push(`${formatFieldName(field)} is empty`);
    } else if (typeof value === 'object') {
      const op = Object.keys(value as object)[0];
      const val = (value as Record<string, unknown>)[op];
      results.push(formatConditionWithOperator(field, op, val));
    } else {
      results.push(`${formatFieldName(field)} equals "${value}"`);
    }
  }
  
  return results;
}
```

### SLA Highlight Colors

| Trigger | Border Color | Badge Color |
|---------|--------------|-------------|
| `sla_at_risk` | `border-l-amber-500` | `bg-amber-100 text-amber-700` |
| `sla_breached` | `border-l-red-500` | `bg-red-100 text-red-700` |
| Other triggers | Default | Default |

---

## Definition of Done

Phase 4.2 is complete when:

1. All 4 new trigger events are in TypeScript types
2. All 5 new audit events are in AuditEventType
3. formatConditions and formatActions produce readable output
4. AutomationRuleDetailDrawer shows full rule details
5. automationExecutionService validates action safety
6. SLA-related executions have visual highlighting
7. Entity links navigate to correct admin pages
8. Rules can be individually enabled by super_admin
9. All actions are non-destructive (notify, tag, log only)
