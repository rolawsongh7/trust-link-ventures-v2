
# Phase 4.3 Audit & Implementation Plan: Customer-Facing Automation

## Audit Summary

### Already Implemented (Substantial Foundation)

| Component | Status | Details |
|-----------|--------|---------|
| **TriggerEvent types** | Done | `partial_payment_received`, `balance_due_detected` added |
| **ActionType types** | Done | `send_customer_email`, `send_customer_notification` added |
| **AuditEventType** | Done | 5 customer automation events added |
| **CustomerAutomationService** | Done | 594-line service with throttling, attribution, idempotency |
| **THROTTLE_WINDOWS** | Done | Configured for payment/balance/status/delay notices |
| **AUTOMATION_ATTRIBUTION** | Done | "Automated update from Trust Link Company" |
| **executePaymentReminder()** | Done | Payment overdue emails with balance info |
| **executeStatusNotification()** | Done | Status change in-app notifications |
| **executePartialPaymentAck()** | Done | Payment received acknowledgement |
| **executeBalanceReminder()** | Done | Balance due reminders |
| **executeDelayNotice()** | Done | SLA breach courtesy notices |
| **areNotificationsEnabled()** | Done | Customer preference check |

### Missing (Required for Phase 4.3 Completion)

| Component | Status | Required Work |
|-----------|--------|---------------|
| **Database: 5 customer-facing rules** | Missing | Seed 5 new automation rules (disabled by default) |
| **automationExecutionService integration** | Missing | Add `send_customer_email` and `send_customer_notification` cases |
| **send-email template** | Missing | Add `automated_customer_notification` email type |
| **AutomationControl.tsx** | Needs Update | Update phase notice to "4.3 Active" |
| **Customer-facing rule badges** | Missing | Visual indicator for customer-facing rules |
| **Execution log enhancements** | Missing | Show "Customer Notified" badge for customer-facing executions |

---

## Implementation Details

### 1. Database Migration: Seed 5 Customer-Facing Rules

Create a new migration that inserts 5 rules (all `enabled = false`):

**Rule 1: Payment Reminder (Customer Notification)**
- Trigger: `payment_overdue`
- Entity: `order`
- Conditions: `{ "payment_status": { "not_equals": "fully_paid" } }`
- Actions: `[{ type: "send_customer_email", config: { ... } }]`

**Rule 2: Order Status Progress Notification**
- Trigger: `order_status_changed`
- Entity: `order`
- Conditions: `{ "status": { "in": ["processing", "ready_to_ship", "shipped"] } }`
- Actions: `[{ type: "send_customer_notification", config: { ... } }]`

**Rule 3: Partial Payment Acknowledgement**
- Trigger: `partial_payment_received`
- Entity: `order`
- Conditions: `{ "payment_status": { "not_equals": "fully_paid" } }`
- Actions: `[{ type: "send_customer_notification", config: { ... } }]`

**Rule 4: Balance Due Reminder**
- Trigger: `balance_due_detected`
- Entity: `order`
- Conditions: `{ "balance_remaining": { "greater_than": 0 } }`
- Actions: `[{ type: "send_customer_notification", config: { ... } }]`

**Rule 5: Delivery Delay Courtesy Notice**
- Trigger: `sla_breached`
- Entity: `order`
- Conditions: `{ "sla_status": "breached" }`
- Actions: `[{ type: "send_customer_email", config: { notification_type: "delay_notice" } }]`

---

### 2. Update automationExecutionService.ts

Add cases for customer-facing actions in the `executeAction` switch:

```typescript
case 'send_customer_email':
  return await this.executeCustomerEmail(action, context);

case 'send_customer_notification':
  return await this.executeCustomerNotification(action, context);
```

Add private methods that delegate to `CustomerAutomationService`:
- `executeCustomerEmail()` - calls `CustomerAutomationService.sendCustomerEmail()`
- `executeCustomerNotification()` - calls `CustomerAutomationService.sendCustomerNotification()`

These methods require fetching customer context (customerId, customerEmail, orderNumber) from the order.

---

### 3. Update send-email Edge Function

Add `automated_customer_notification` email type support:

```typescript
case 'automated_customer_notification':
  html = generateAutomatedCustomerNotificationEmail(data);
  break;
```

Create `generateAutomatedCustomerNotificationEmail()` function with:
- Clear "Automated update" attribution
- Professional, non-threatening tone
- Link to customer portal
- Contact support option
- Order reference

---

### 4. Update AutomationControl.tsx

Change phase notice from:
> "Phase 4.2: SLA & Risk Automation Active"

To:
> "Phase 4.3: Customer-Facing Automation Active"

Update description:
> "10 pre-configured automation rules including 5 customer-facing notification rules. All rules are disabled by default. Customer notifications respect preferences and throttling."

---

### 5. Enhance AutomationRulesList.tsx

Add visual indicators for customer-facing rules:
- Blue left border for rules with `send_customer_*` actions
- "Customer Facing" badge on rule cards
- Tooltip: "This rule may send notifications to customers"

Add helper function:
```typescript
function isCustomerFacingRule(rule: AutomationRule): boolean {
  return rule.actions.some(a => 
    a.type === 'send_customer_email' || 
    a.type === 'send_customer_notification'
  );
}
```

---

### 6. Enhance AutomationExecutionLog.tsx

Add customer notification indicators:
- Badge: "Customer Notified" for customer-facing executions
- Show throttle status: "Throttled - No duplicate sent"
- Filter option: "Customer Notifications" in status dropdown

---

### 7. Enhance AutomationRuleDetailDrawer.tsx

For customer-facing rules, add informational banner:
> "This rule sends notifications to customers. Messages include attribution and respect notification preferences."

Show throttle configuration in action display.

---

## File Changes Summary

### New Files (1)

| File | Purpose |
|------|---------|
| Migration SQL | Seed 5 customer-facing automation rules |

### Modified Files (5)

| File | Changes |
|------|---------|
| `src/services/automationExecutionService.ts` | Add customer action cases, delegate to CustomerAutomationService |
| `supabase/functions/send-email/index.ts` | Add `automated_customer_notification` template |
| `src/pages/admin/AutomationControl.tsx` | Update phase notice to 4.3 |
| `src/components/automation/AutomationRulesList.tsx` | Add customer-facing rule indicators |
| `src/components/automation/AutomationExecutionLog.tsx` | Add customer notification badges |
| `src/components/automation/AutomationRuleDetailDrawer.tsx` | Add customer-facing rule info banner |

---

## Safety Constraints (Verified)

All Phase 4.3 rules will:
1. Be created with `enabled = false`
2. Respect global automation toggle
3. Respect customer notification preferences
4. Use throttling (24-48 hours for payment reminders)
5. Include clear "Automated update" attribution
6. Never send duplicate messages within throttle window
7. Exit early on missing email (fallback to in-app only)
8. Log all actions to audit trail
9. Never modify financial or order data

---

## Explicitly Forbidden (Verified in FORBIDDEN_ACTIONS)

- `delete_record`
- `modify_payment`
- `modify_total`
- `cancel_order`
- `create_refund`
- `delete_customer`
- `modify_invoice`

---

## Definition of Done

Phase 4.3 is complete when:

1. 5 customer-facing automation rules exist in database (disabled)
2. `send_customer_email` and `send_customer_notification` actions execute via CustomerAutomationService
3. Email template for automated customer notifications exists
4. Throttling prevents duplicate notifications
5. Attribution appears on all automated customer messages
6. Admin UI shows customer-facing rule indicators
7. Execution log shows customer notification status
8. All rules are opt-in and respect customer preferences
9. No financial or destructive actions are possible
