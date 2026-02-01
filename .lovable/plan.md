
# Phase 4.3: Customer-Facing Automation - Complete Implementation Plan

## Overview
This plan completes Phase 4.3 by implementing the infrastructure needed to execute customer-facing automation actions. The database already contains all 10 automation rules (5 internal from Phase 4.2 + 5 customer-facing), but the code to execute `send_customer_email` and `send_customer_notification` actions is missing.

## Current State Analysis

| Component | Status | Notes |
|-----------|--------|-------|
| Database Rules | Complete | 10 rules exist, 5 are customer-facing |
| automationHelpers.ts | Incomplete | Missing customer action types |
| automationExecutionService.ts | Incomplete | Missing customer action handlers |
| CustomerAutomationService.ts | Missing | Core service needed |
| send-email Edge Function | Incomplete | Missing automated_customer_notification type |
| UI Components | Incomplete | Missing customer-facing indicators |

## Implementation Items (7 Total)

---

### 1. Create CustomerAutomationService.ts (NEW FILE)

**Purpose**: Core service handling customer-facing automation with throttling, attribution, and preference checking.

**Location**: `src/services/CustomerAutomationService.ts`

**Features**:
- Throttle windows to prevent notification spam:
  - Payment reminder: 48 hours
  - Balance reminder: 72 hours  
  - Status notification: 1 hour (debounce rapid changes)
  - Delay notice: 48 hours
- Attribution message: "Automated update from Trust Link Ventures"
- Customer preference checking before sending
- Delegation to NotificationService for in-app notifications
- Delegation to send-email Edge Function for emails
- Audit logging for all customer communications

**Key Methods**:
- `isCustomerNotificationsEnabled(userId)` - Check customer preferences
- `isThrottled(ruleId, entityId, throttleHours)` - Check throttle window
- `sendCustomerEmail(type, orderId, customerId, config)` - Send automated email
- `sendCustomerNotification(orderId, customerId, config)` - Send in-app notification

---

### 2. Update automationHelpers.ts

**Purpose**: Add customer-facing action types to the type system.

**Changes**:

```text
Add to ActionType union (line 27-32):
  | 'send_customer_email'
  | 'send_customer_notification'

Add to ALLOWED_ACTIONS array (line 122-128):
  'send_customer_email',
  'send_customer_notification',

Add to formatActionType function (line 310-318):
  'send_customer_email': 'Send Customer Email',
  'send_customer_notification': 'Send Customer Notification',

Add new helper function:
  export function isCustomerFacingAction(action: string): boolean {
    return action === 'send_customer_email' || action === 'send_customer_notification';
  }

Add customer-facing highlight helper:
  export function getCustomerFacingHighlightColor(): { border: string; badge: string } {
    return {
      border: 'border-l-4 border-l-blue-500',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
  }
```

---

### 3. Update automationExecutionService.ts

**Purpose**: Add execution handlers for customer-facing actions.

**Changes**:

1. Import CustomerAutomationService at top
2. Add cases to `executeAction` switch statement:

```text
case 'send_customer_email':
  return await this.executeCustomerEmail(action, context);

case 'send_customer_notification':
  return await this.executeCustomerNotification(action, context);
```

3. Add private executor methods:

**executeCustomerEmail**:
- Fetch order and customer context
- Check throttle window (skip if throttled)
- Check customer notification preferences
- Call CustomerAutomationService.sendCustomerEmail
- Return appropriate ActionResult with throttled/sent status

**executeCustomerNotification**:
- Fetch order and customer context
- Check throttle window
- Check customer notification preferences  
- Call CustomerAutomationService.sendCustomerNotification
- Return ActionResult

---

### 4. Update send-email Edge Function

**Purpose**: Add `automated_customer_notification` email type with variants.

**Location**: `supabase/functions/send-email/index.ts`

**Changes**:

1. Add to EmailRequest type union:
   - `'automated_customer_notification'`

2. Add case in switch statement:
   ```text
   case 'automated_customer_notification':
     html = generateAutomatedCustomerNotificationEmail(data);
     from = "Trust Link Ventures <info@trustlinkcompany.com>";
     break;
   ```

3. Add new template function `generateAutomatedCustomerNotificationEmail`:

**Supported notification_type variants**:
- `payment_reminder` - Polite payment overdue notice
- `status_update` - Order status change notification
- `payment_received` - Partial payment acknowledgement
- `balance_due` - Balance remaining reminder
- `delay_notice` - SLA breach courtesy notice

**Email Template Design**:
- Professional header with Trust Link branding
- Clear, non-threatening messaging
- Attribution footer: "This is an automated update from Trust Link Ventures"
- Customer portal link button
- Contact support option
- Order reference in all emails

---

### 5. Update AutomationControl.tsx

**Purpose**: Update phase status notice from 4.2 to 4.3.

**Location**: `src/pages/admin/AutomationControl.tsx`

**Changes** (lines 57-69):

```text
Before:
  Phase 4.2: SLA & Risk Automation Active
  5 pre-configured automation rules...

After:
  Phase 4.3: Customer-Facing Automation Active
  10 pre-configured automation rules including 5 customer-facing notification rules.
  All rules are disabled by default. Customer notifications respect preferences and throttling.
```

---

### 6. Update AutomationRulesList.tsx

**Purpose**: Add visual indicators for customer-facing rules.

**Location**: `src/components/automation/AutomationRulesList.tsx`

**Changes**:

1. Import `isCustomerFacingAction` and `getCustomerFacingHighlightColor` from automationHelpers

2. Add check in RuleRow component:
   ```text
   const isCustomerFacing = rule.actions?.some(a => isCustomerFacingAction(a.type));
   const customerColors = isCustomerFacing ? getCustomerFacingHighlightColor() : null;
   ```

3. Apply border styling:
   - Blue left border for customer-facing rules
   - SLA border takes precedence if both apply

4. Add "Customer" badge next to "SLA" badge:
   ```text
   {isCustomerFacing && (
     <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
       Customer
     </Badge>
   )}
   ```

---

### 7. Update AutomationExecutionLog.tsx

**Purpose**: Add customer notification status indicators in execution log.

**Location**: `src/components/automation/AutomationExecutionLog.tsx`

**Changes**:

1. Import `isCustomerFacingAction` from automationHelpers

2. Add helper to check if execution was customer-facing:
   ```text
   const isCustomerExecution = (result: Record<string, unknown>) => {
     return result?.customerNotified === true;
   };
   
   const wasThrottled = (result: Record<string, unknown>) => {
     return result?.throttled === true;
   };
   ```

3. Add badges in ExecutionRow expanded section:
   - "Customer Notified" badge (blue) when customerNotified is true
   - "Throttled" badge (yellow) when execution was throttled

4. Add filter option to status dropdown:
   - Add "Customer" option that filters executions by result.customerNotified

---

## Technical Safety Details

### Throttle Windows Configuration
```text
THROTTLE_WINDOWS = {
  payment_reminder: 48 hours,
  balance_reminder: 72 hours,
  status_notification: 1 hour,
  delay_notice: 48 hours
}
```

### Attribution
All automated customer communications will include:
- Email footer: "This is an automated update from Trust Link Ventures. If you have questions, please contact support@trustlinkcompany.com"
- Metadata flag: `automated: true`

### Safety Guarantees
1. All 10 rules disabled by default (already done in database)
2. Respects global automation kill switch
3. Respects customer notification preferences
4. Uses throttling to prevent duplicate messages
5. Logs all actions to audit trail
6. Never modifies financial or order data
7. Non-destructive actions only

---

## File Summary

| Action | File |
|--------|------|
| CREATE | src/services/CustomerAutomationService.ts |
| UPDATE | src/utils/automationHelpers.ts |
| UPDATE | src/services/automationExecutionService.ts |
| UPDATE | supabase/functions/send-email/index.ts |
| UPDATE | src/pages/admin/AutomationControl.tsx |
| UPDATE | src/components/automation/AutomationRulesList.tsx |
| UPDATE | src/components/automation/AutomationExecutionLog.tsx |

---

## Verification Checklist

After implementation, Phase 4.3 is complete when:
- [ ] CustomerAutomationService exists with throttling and attribution
- [ ] `send_customer_email` action type is recognized and executes
- [ ] `send_customer_notification` action type is recognized and executes
- [ ] Email template for automated customer notifications renders correctly
- [ ] Throttling prevents duplicate notifications within window
- [ ] Attribution appears on all automated customer messages
- [ ] Admin UI shows "Customer" badges on customer-facing rules
- [ ] Execution log shows "Customer Notified" and "Throttled" badges
- [ ] Phase 4.3 status notice displays in Automation Control page
