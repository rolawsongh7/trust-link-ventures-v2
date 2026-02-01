
# Phase 4.3 Complete Implementation Plan

## Current Status
The database already contains all 10 automation rules (5 from Phase 4.2 + 5 customer-facing from Phase 4.3). However, the code infrastructure to execute customer-facing actions is missing.

## Missing Components (7 Items)

| Item | File | Status |
|------|------|--------|
| CustomerAutomationService | src/services/CustomerAutomationService.ts | **CREATE** |
| Customer action types | src/utils/automationHelpers.ts | **UPDATE** |
| Action executor integration | src/services/automationExecutionService.ts | **UPDATE** |
| Automated email template | supabase/functions/send-email/index.ts | **UPDATE** |
| Phase 4.3 UI notice | src/pages/admin/AutomationControl.tsx | **UPDATE** |
| Customer-facing rule badges | src/components/automation/AutomationRulesList.tsx | **UPDATE** |
| Customer notification badges | src/components/automation/AutomationExecutionLog.tsx | **UPDATE** |

---

## 1. Create CustomerAutomationService.ts (NEW FILE)

Create a comprehensive service that handles all customer-facing automation:

**Features:**
- Throttle windows (24-48 hours for payment reminders, 72 hours for balance reminders)
- Attribution message: "Automated update from Trust Link Ventures"
- Customer notification preference checking
- Email + in-app notification delivery
- Audit logging for all customer communications

**Methods:**
- `sendPaymentReminder()` - Polite payment overdue emails
- `sendStatusNotification()` - Order status change notifications
- `sendPartialPaymentAck()` - Payment received acknowledgements
- `sendBalanceReminder()` - Balance due reminders
- `sendDelayNotice()` - SLA breach courtesy notices
- `isThrottled()` - Check notification throttle window
- `areNotificationsEnabled()` - Check customer preferences

---

## 2. Update automationHelpers.ts

Add customer-facing action types:

```typescript
// Add to ActionType union
export type ActionType = 
  | 'send_notification'
  | 'create_task'
  | 'log_audit_event'
  | 'assign_staff'
  | 'add_tag'
  | 'send_customer_email'      // NEW
  | 'send_customer_notification'; // NEW

// Add to ALLOWED_ACTIONS array
export const ALLOWED_ACTIONS: ActionType[] = [
  'send_notification',
  'create_task',
  'log_audit_event',
  'assign_staff',
  'add_tag',
  'send_customer_email',       // NEW
  'send_customer_notification', // NEW
];
```

Add formatting for new actions and helper function:

```typescript
// Add to formatActionType
'send_customer_email': 'Send Customer Email',
'send_customer_notification': 'Send Customer Notification',

// Add new helper
export function isCustomerFacingAction(action: string): boolean {
  return action === 'send_customer_email' || action === 'send_customer_notification';
}
```

---

## 3. Update automationExecutionService.ts

Add cases for customer-facing actions in the `executeAction` switch:

```typescript
case 'send_customer_email':
  return await this.executeCustomerEmail(action, context);

case 'send_customer_notification':
  return await this.executeCustomerNotification(action, context);
```

Add private methods that:
1. Fetch order and customer context
2. Check throttle window
3. Check customer notification preferences
4. Delegate to CustomerAutomationService
5. Return appropriate ActionResult

---

## 4. Update send-email Edge Function

Add `automated_customer_notification` email type with the following variants:
- `payment_reminder` - Payment overdue notification
- `status_update` - Order status change
- `payment_received` - Partial payment acknowledgement
- `balance_due` - Balance remaining reminder
- `delay_notice` - SLA breach courtesy notice

**Email Design Requirements:**
- Clear "Automated update from Trust Link Ventures" attribution
- Professional, non-threatening tone
- Link to customer portal
- Contact support option
- Order reference in all emails

---

## 5. Update AutomationControl.tsx

Change phase notice:

**Before:**
```
Phase 4.2: SLA & Risk Automation Active
5 pre-configured automation rules...
```

**After:**
```
Phase 4.3: Customer-Facing Automation Active
10 pre-configured automation rules including 5 customer-facing notification rules. 
All rules are disabled by default. Customer notifications respect preferences and throttling.
```

---

## 6. Update AutomationRulesList.tsx

Add visual indicators for customer-facing rules:
- Blue left border for rules with `send_customer_*` actions
- "Customer" badge on rule cards (distinct from "SLA" badge)
- Tooltip explaining customer notification behavior

---

## 7. Update AutomationExecutionLog.tsx

Add execution status indicators:
- "Customer Notified" badge for successful customer-facing executions
- "Throttled" badge when notification was skipped due to throttle window
- Filter option in status dropdown for customer notifications

---

## Technical Details

### CustomerAutomationService Constants

```typescript
const THROTTLE_WINDOWS = {
  payment_reminder: 48 * 60 * 60 * 1000,    // 48 hours
  balance_reminder: 72 * 60 * 60 * 1000,    // 72 hours
  status_notification: 1 * 60 * 60 * 1000,  // 1 hour (debounce rapid changes)
  delay_notice: 48 * 60 * 60 * 1000,        // 48 hours
};

const AUTOMATION_ATTRIBUTION = "Automated update from Trust Link Ventures";
```

### Email Template Structure

```typescript
function generateAutomatedCustomerNotificationEmail(data: any): string {
  // Header with branding
  // Main content based on notification_type
  // Clear attribution footer
  // Support contact link
  // Portal access button
}
```

### Safety Guarantees

All customer-facing automation will:
1. Be disabled by default (already done in database)
2. Respect global automation toggle
3. Respect customer notification preferences
4. Use throttling to prevent duplicate messages
5. Include clear "Automated update" attribution
6. Log all actions to audit trail
7. Never modify financial or order data

---

## Files to Create (1)

| File | Purpose |
|------|---------|
| src/services/CustomerAutomationService.ts | Core customer automation logic with throttling |

## Files to Modify (6)

| File | Changes |
|------|---------|
| src/utils/automationHelpers.ts | Add customer action types and helper |
| src/services/automationExecutionService.ts | Add customer action executors |
| supabase/functions/send-email/index.ts | Add automated notification email type |
| src/pages/admin/AutomationControl.tsx | Update phase notice to 4.3 |
| src/components/automation/AutomationRulesList.tsx | Add customer-facing rule indicators |
| src/components/automation/AutomationExecutionLog.tsx | Add customer notification badges |

---

## Definition of Done

Phase 4.3 is complete when:
1. CustomerAutomationService exists with throttling and attribution
2. `send_customer_email` and `send_customer_notification` execute properly
3. Email template for automated customer notifications works
4. Throttling prevents duplicate notifications
5. Attribution appears on all automated customer messages
6. Admin UI shows customer-facing rule indicators
7. Execution log shows customer notification status
8. All rules remain opt-in and respect customer preferences
