# Phase 4.4 — Automation Analytics, Trust & ROI Measurement

## Overview

Phase 4.4 adds **measurement, visibility, and trust controls** to prove automation is helping operations. This phase does NOT add new automation behavior—it adds observability and accountability.

**Goal**: Answer these questions:
- Is automation helping or hurting?
- Which rules create value?
- Where is automation noisy or ineffective?
- Are customers responding positively?
- Can automation be safely expanded?

---

## Implementation Tasks

### Task 1: Database Schema Extensions

**Migration 1: `automation_metrics_daily` table**
Pre-aggregated metrics for performance tracking.

```sql
CREATE TABLE public.automation_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automation_rules(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  executions INTEGER DEFAULT 0,
  successes INTEGER DEFAULT 0,
  failures INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  affected_entities INTEGER DEFAULT 0,
  customer_notifications_sent INTEGER DEFAULT 0,
  customer_notifications_throttled INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rule_id, date)
);

-- Enable RLS
ALTER TABLE automation_metrics_daily ENABLE ROW LEVEL SECURITY;

-- Admin read-only access
CREATE POLICY "Admins can view automation metrics"
  ON automation_metrics_daily FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  ));

-- Index for date range queries
CREATE INDEX idx_automation_metrics_date ON automation_metrics_daily(date DESC);
CREATE INDEX idx_automation_metrics_rule ON automation_metrics_daily(rule_id, date DESC);
```

**Migration 2: `automation_feedback` table**
Optional human feedback loop for staff trust signals.

```sql
CREATE TABLE public.automation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES automation_executions(id) ON DELETE CASCADE,
  feedback_type TEXT CHECK (feedback_type IN ('helpful', 'neutral', 'harmful')) NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE automation_feedback ENABLE ROW LEVEL SECURITY;

-- Admins can submit feedback
CREATE POLICY "Admins can create feedback"
  ON automation_feedback FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  ));

-- Admins can view feedback
CREATE POLICY "Admins can view feedback"
  ON automation_feedback FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  ));

-- Index for execution lookups
CREATE INDEX idx_automation_feedback_execution ON automation_feedback(execution_id);
CREATE INDEX idx_automation_feedback_type ON automation_feedback(feedback_type, created_at DESC);
```

**Migration 3: Helper function for daily aggregation**
```sql
CREATE OR REPLACE FUNCTION aggregate_automation_metrics(target_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS void AS $$
BEGIN
  INSERT INTO automation_metrics_daily (
    rule_id, 
    date, 
    executions, 
    successes, 
    failures, 
    skipped, 
    affected_entities,
    customer_notifications_sent,
    customer_notifications_throttled
  )
  SELECT 
    rule_id,
    target_date,
    COUNT(*) as executions,
    COUNT(*) FILTER (WHERE status = 'success') as successes,
    COUNT(*) FILTER (WHERE status = 'failure') as failures,
    COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
    COUNT(DISTINCT entity_id) as affected_entities,
    COUNT(*) FILTER (WHERE (result->>'customerNotified')::boolean = true) as customer_notifications_sent,
    COUNT(*) FILTER (WHERE (result->>'throttled')::boolean = true) as customer_notifications_throttled
  FROM automation_executions
  WHERE executed_at::date = target_date
  GROUP BY rule_id
  ON CONFLICT (rule_id, date) DO UPDATE SET
    executions = EXCLUDED.executions,
    successes = EXCLUDED.successes,
    failures = EXCLUDED.failures,
    skipped = EXCLUDED.skipped,
    affected_entities = EXCLUDED.affected_entities,
    customer_notifications_sent = EXCLUDED.customer_notifications_sent,
    customer_notifications_throttled = EXCLUDED.customer_notifications_throttled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Task 2: Automation Analytics Service

**File: `src/services/automationAnalyticsService.ts`**

Core service providing analytics data:

```typescript
interface HealthOverview {
  totalExecutions: number;
  successRate: number;
  failureRate: number;
  activeRulesCount: number;
  autoDisabledCount: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
}

interface RulePerformance {
  ruleId: string;
  ruleName: string;
  triggerEvent: string;
  enabled: boolean;
  autoDisabled: boolean;
  executions30d: number;
  successRate: number;
  failureRate: number;
  avgPerDay: number;
  lastRun: string | null;
  isCustomerFacing: boolean;
}

interface RuleDetails {
  rule: RulePerformance;
  dailyTrend: { date: string; executions: number; successes: number; failures: number }[];
  skipReasons: { reason: string; count: number }[];
  impactMetrics: {
    entitiesAffected: number;
    customerNotificationsSent: number;
    customerNotificationsThrottled: number;
  };
}

interface CustomerImpactMetrics {
  notificationsSent7d: number;
  notificationsSent30d: number;
  throttledRate: number;
  warningsCount: number;
  warnings: string[];
}

interface StaffTrustMetrics {
  totalFeedback: number;
  helpfulCount: number;
  neutralCount: number;
  harmfulCount: number;
  recentFeedback: AutomationFeedback[];
}

class AutomationAnalyticsService {
  // Health Overview KPIs
  static async getHealthOverview(days: number): Promise<HealthOverview>
  
  // Rule Performance Table
  static async getRulePerformance(days: number): Promise<RulePerformance[]>
  
  // Single Rule Details
  static async getRuleDetails(ruleId: string, days: number): Promise<RuleDetails>
  
  // Customer Impact Metrics
  static async getCustomerImpactMetrics(days: number): Promise<CustomerImpactMetrics>
  
  // Staff Trust Signals
  static async getStaffTrustMetrics(days: number): Promise<StaffTrustMetrics>
  
  // Submit Feedback
  static async submitFeedback(
    executionId: string, 
    feedbackType: 'helpful' | 'neutral' | 'harmful',
    notes?: string
  ): Promise<void>
}
```

---

### Task 3: Automation Trust Service (Auto-Degrade Logic)

**File: `src/services/automationTrustService.ts`**

Implements automatic rule degradation for safety:

```typescript
interface DegradeConfig {
  failureThreshold: number;        // Default: 30% in 24h
  minExecutionsForEval: number;    // Default: 10 (don't eval with too few)
  maxExecutionsPerEntity: number;  // Default: 3 per entity per day
  harmfulFeedbackThreshold: number; // Default: 3 harmful in 7 days
}

interface TrustEvaluation {
  shouldDegrade: boolean;
  reason?: string;
  metrics: {
    failureRate24h: number;
    maxEntityExecutions: number;
    harmfulFeedbackCount: number;
  };
}

class AutomationTrustService {
  static readonly DEFAULT_CONFIG: DegradeConfig = {
    failureThreshold: 0.30,
    minExecutionsForEval: 10,
    maxExecutionsPerEntity: 3,
    harmfulFeedbackThreshold: 3,
  };

  // Evaluate if rule should be auto-disabled
  static async evaluateRuleTrust(ruleId: string): Promise<TrustEvaluation>
  
  // Auto-disable rule with audit trail
  static async degradeRule(ruleId: string, reason: string): Promise<void>
  
  // Notify super_admin of degradation
  static async notifyDegradation(ruleId: string, ruleName: string, reason: string): Promise<void>
  
  // Check and potentially degrade after each execution
  static async checkPostExecution(ruleId: string): Promise<void>
}
```

**Trigger Conditions for Auto-Disable:**
1. **Failure spike**: >30% failure rate in last 24h (min 10 executions)
2. **Entity spam**: Same entity triggered >3 times by same rule in 24h
3. **Negative feedback**: 3+ "harmful" feedback in 7 days

---

### Task 4: Analytics Hooks

**File: `src/hooks/useAutomationAnalytics.ts`**

React Query hooks for analytics data:

```typescript
// Health overview with loading/error states
export function useHealthOverview(days: number = 7)

// Paginated rule performance table
export function useRulePerformance(days: number = 30, filters?: RuleFilters)

// Single rule detailed metrics
export function useRuleDetails(ruleId: string, days: number = 30)

// Customer-facing automation metrics
export function useCustomerImpact(days: number = 7)

// Staff feedback metrics
export function useStaffTrust(days: number = 30)

// Submit feedback mutation
export function useSubmitFeedback()
```

---

### Task 5: Analytics Page Components

**Route: `/admin/automation/analytics`**

#### Component Structure:
```
src/components/admin/automation/analytics/
├── AutomationAnalyticsPage.tsx       # Main page with sections
├── HealthOverviewSection.tsx         # KPI cards with health indicators
├── RulePerformanceTable.tsx          # Sortable rule performance table
├── RuleDetailDrawer.tsx              # Drawer with rule deep-dive
├── CustomerImpactSection.tsx         # Customer-facing metrics + warnings
├── StaffTrustSection.tsx             # Feedback summary and recent list
├── FeedbackDialog.tsx                # Submit feedback modal
├── AnalyticsMetricCard.tsx           # Metric card with trend/status
└── ExecutionTrendChart.tsx           # Daily execution trend visualization
```

---

#### Section 1: Health Overview (`HealthOverviewSection.tsx`)

**KPI Cards:**
| Metric | Description |
|--------|-------------|
| Total Executions | Count (7d or 30d toggle) |
| Success Rate % | With trend indicator |
| Failure Rate % | With warning threshold |
| Active Rules | Currently enabled count |
| Auto-Disabled | Rules disabled due to errors (warning if > 0) |

**Health Status Indicators:**
- 🟢 **Healthy**: Success rate > 95%, no auto-disabled rules
- 🟡 **Warning**: Success rate 80-95% OR 1+ auto-disabled rules
- 🔴 **Critical**: Success rate < 80% OR 3+ auto-disabled rules

---

#### Section 2: Rule Performance Table (`RulePerformanceTable.tsx`)

**Columns:**
| Rule Name | Trigger | Status | Executions (30d) | Success % | Fail % | Avg/Day | Last Run | Actions |

**Features:**
- Sortable by: Fail rate (desc), Volume (desc), Last run (desc)
- Filters: All / Active / Disabled / Customer-facing
- Row click opens RuleDetailDrawer
- Customer-facing rules have blue left border
- Auto-disabled rules show warning icon

---

#### Section 3: Rule Detail Drawer (`RuleDetailDrawer.tsx`)

**Metrics Panel:**
- Execution trend chart (daily, 30d)
- Success vs failure breakdown (donut chart)
- Skip reasons breakdown

**Impact Panel:**
- Entities affected count
- Customer notifications sent
- Customer notifications throttled

**Actions Panel (super_admin only):**
- Enable/Disable toggle
- Temporary pause (1h / 24h)
- View execution log link

---

#### Section 4: Customer Impact (`CustomerImpactSection.tsx`)

**Metric Cards:**
- Notifications sent (7d)
- Throttle prevention rate (%)
- Failed deliveries (if any)

**Warnings Panel:**
- High volume alerts (>50 notifications/day)
- Repeated reminders to same customer (>2 in 7d)
- Failed notification deliveries

---

#### Section 5: Staff Trust (`StaffTrustSection.tsx`)

**Feedback Summary:**
- Helpful / Neutral / Harmful counts
- Trend indicator (improving/declining)

**Recent Feedback List:**
- Execution reference
- Feedback type badge
- Notes (if any)
- Timestamp

---

#### Feedback Dialog (`FeedbackDialog.tsx`)

**Usage:** Triggered from execution log entries

**Fields:**
- Feedback type: Helpful / Neutral / Harmful (radio group)
- Notes (optional textarea)
- Submit button

---

### Task 6: Navigation & Routing Updates

**Files to Update:**

1. **`src/App.tsx`** - Add route:
```typescript
<Route path="/admin/automation/analytics" element={<AutomationAnalyticsPage />} />
```

2. **`src/components/admin/automation/AutomationAdminPage.tsx`** - Add tab:
```typescript
// Add "Analytics" tab to existing tabs
<TabsTrigger value="analytics">Analytics</TabsTrigger>
<TabsContent value="analytics">
  <AutomationAnalyticsPage embedded />
</TabsContent>
```

3. **`src/components/automation/AutomationExecutionLog.tsx`** - Add feedback button:
```typescript
// Add feedback button to each execution row
<Button size="sm" variant="ghost" onClick={() => openFeedbackDialog(execution.id)}>
  <MessageSquare className="h-4 w-4" />
</Button>
```

---

### Task 7: Integration with Execution Flow

**File: `src/services/automationExecutionService.ts`**

Add post-execution trust check:

```typescript
// After logExecution(), add:
if (params.status === 'failure') {
  await AutomationTrustService.checkPostExecution(params.ruleId);
}
```

---

## Implementation Order

### Phase 4.4.1: Database Foundation
1. Create migration for `automation_metrics_daily` table
2. Create migration for `automation_feedback` table
3. Create `aggregate_automation_metrics` function

### Phase 4.4.2: Services
4. Create `automationAnalyticsService.ts`
5. Create `automationTrustService.ts`
6. Create `useAutomationAnalytics.ts` hooks

### Phase 4.4.3: Analytics UI
7. Create `AutomationAnalyticsPage.tsx` with routing
8. Create `HealthOverviewSection.tsx`
9. Create `RulePerformanceTable.tsx`
10. Create `RuleDetailDrawer.tsx`

### Phase 4.4.4: Extended Analytics
11. Create `CustomerImpactSection.tsx`
12. Create `StaffTrustSection.tsx`
13. Create `FeedbackDialog.tsx`

### Phase 4.4.5: Integration
14. Add feedback button to execution log
15. Integrate auto-degrade with execution flow
16. Add navigation and routing

---

## Security & Access Control

| Feature | super_admin | admin |
|---------|-------------|-------|
| View analytics dashboard | ✅ | ✅ |
| View rule details | ✅ | ✅ |
| Submit feedback | ✅ | ✅ |
| Enable/Disable rules | ✅ | ❌ |
| Configure thresholds | ✅ | ❌ |
| Export analytics data | ✅ | ❌ |

---

## Testing Checklist

### Analytics Accuracy
- [ ] Metrics match raw execution logs
- [ ] Daily aggregation runs correctly
- [ ] Date range filtering works
- [ ] Customer notification counts accurate

### Safety
- [ ] Auto-degrade triggers at threshold
- [ ] Disabled rule stops counting
- [ ] Kill switch reflected in analytics
- [ ] Degradation notification sent

### Performance
- [ ] Analytics page loads < 2s
- [ ] Large datasets don't block UI
- [ ] Pre-aggregated metrics used for charts

### UI/UX
- [ ] Health indicators show correctly
- [ ] Table sorting works
- [ ] Rule detail drawer opens
- [ ] Feedback submission works

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/automationAnalyticsService.ts` | Analytics data service |
| `src/services/automationTrustService.ts` | Auto-degrade logic |
| `src/hooks/useAutomationAnalytics.ts` | React Query hooks |
| `src/components/admin/automation/analytics/AutomationAnalyticsPage.tsx` | Main analytics page |
| `src/components/admin/automation/analytics/HealthOverviewSection.tsx` | Health KPIs |
| `src/components/admin/automation/analytics/RulePerformanceTable.tsx` | Performance table |
| `src/components/admin/automation/analytics/RuleDetailDrawer.tsx` | Rule deep-dive |
| `src/components/admin/automation/analytics/CustomerImpactSection.tsx` | Customer metrics |
| `src/components/admin/automation/analytics/StaffTrustSection.tsx` | Staff feedback |
| `src/components/admin/automation/analytics/FeedbackDialog.tsx` | Feedback modal |
| `src/components/admin/automation/analytics/AnalyticsMetricCard.tsx` | Metric card |
| `src/components/admin/automation/analytics/ExecutionTrendChart.tsx` | Trend chart |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add analytics route |
| `src/components/admin/automation/AutomationAdminPage.tsx` | Add analytics tab |
| `src/components/automation/AutomationExecutionLog.tsx` | Add feedback button |
| `src/services/automationExecutionService.ts` | Add trust check post-execution |

---

## Definition of Done

Phase 4.4 is complete when:
- [ ] Automation health is visible at a glance (KPI cards)
- [ ] Individual rule performance is measurable (performance table)
- [ ] Customer impact is tracked with warnings
- [ ] Staff can provide feedback on automation quality
- [ ] Risky rules auto-degrade with super_admin notification
- [ ] Analytics load efficiently (< 2s)
- [ ] All security constraints enforced (RLS, role checks)
- [ ] Leadership can make data-driven expansion decisions
