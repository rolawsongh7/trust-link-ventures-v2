

# Plan: AI Insights Engine Enhancement & Analytics Polish

## Overview

This plan covers three categories of improvements to the Advanced Analytics system:
1. Alert fatigue prevention (throttling and grouping)
2. Export functionality (CSV + summary PDF)
3. AI Insights Engine refinement (structured prescriptive output)

---

## Phase 1: Alert Fatigue Prevention

### 1.1 Create Alert Throttling System

**New File: `src/hooks/useAlertThrottling.ts`**

Create a hook to manage alert frequency and prevent notification fatigue:

- Store last alert timestamps per category in localStorage
- Configurable cooldown periods (default: 24 hours)
- Group related insights by category before displaying
- Track dismissed alerts to avoid re-showing

**Key Logic:**
```text
Alert Throttling Rules:
- Same insight type: 24h cooldown
- Same customer-related insight: 12h cooldown
- Critical alerts (cash at risk > threshold): No throttle
- Group up to 3 similar insights into one summary card
```

### 1.2 Update EnhancedAIInsights Component

**File: `src/components/analytics/executive/EnhancedAIInsights.tsx`**

Changes:
- Add `useAlertThrottling` hook integration
- Implement insight grouping logic (e.g., "3 customers at churn risk" instead of 3 separate cards)
- Add "Snooze for 24h" action to each insight card
- Show "X insights snoozed" indicator in header

---

## Phase 2: Export Functionality

### 2.1 Create Export Utilities

**New File: `src/utils/analyticsExport.ts`**

Functions:
- `exportToCSV(data, filename, columns)` - Generic CSV export
- `generateSummaryPDF(insights, metrics, dateRange)` - PDF with executive summary
- `exportCustomerHealthReport(customers)` - Customer-specific export
- `exportOperationsReport(orders)` - Operations metrics export

### 2.2 Create Export UI Components

**New File: `src/components/analytics/ExportDialog.tsx`**

Features:
- Modal dialog with export options
- Checkboxes for specific data slices:
  - Executive Summary (PDF)
  - Customer Health Scores (CSV)
  - At-Risk Orders (CSV)
  - AI Insights (PDF with recommendations)
- Date range selector
- Preview of export contents

### 2.3 Add Export Buttons to Each Tab

**Files to Update:**
- `src/components/analytics/executive/ExecutiveInsightsTab.tsx`
- `src/components/analytics/customers/CustomerIntelligence.tsx`
- `src/components/analytics/operations/OperationsIntelligence.tsx`
- `src/components/analytics/audit/EnhancedAuditTimeline.tsx`

Add export button with contextual options per tab.

---

## Phase 3: AI Insights Engine Enhancement

### 3.1 Upgrade Edge Function Output Schema

**File: `supabase/functions/ai-analytics/index.ts`**

Update the tool schema to enforce the strict output format:

```json
{
  "type": "risk | opportunity | optimization | prediction",
  "title": "Short, human-readable insight title",
  "summary": "Plain-language explanation of what is happening",
  "why_it_matters": "Business impact explanation",
  "estimated_financial_impact": {
    "amount": 12500,
    "currency": "GHS",
    "confidence": "low | medium | high"
  },
  "recommended_action": "Specific, realistic action the user can take",
  "urgency": "immediate | soon | monitor",
  "confidence_score": 0.82,
  "data_sources": ["orders", "payments", "customers"],
  "time_horizon": "short_term | medium_term"
}
```

### 3.2 Enhance System Prompt

**File: `supabase/functions/ai-analytics/index.ts`**

New system prompt with strict rules:
- No generic advice (enforce specificity)
- Every insight must tie to money, risk, or growth
- Conservative confidence scoring
- Limit to 6-8 insights per run, prioritized by impact x urgency
- Safety guardrails (no aggressive recommendations)

### 3.3 Add Data Pre-Processing

**File: `supabase/functions/ai-analytics/index.ts`**

Enhance input data aggregation:
- Payment aging analysis (0-30, 31-60, 60+ days)
- Order cycle time statistics
- Customer activity decay analysis
- Issue frequency patterns
- Quote-to-order conversion timing

### 3.4 Update Frontend Insight Display

**File: `src/components/analytics/executive/EnhancedAIInsights.tsx`**

Update to display new structured fields:
- Financial impact badge with confidence indicator
- "Why it matters" expandable section
- Urgency color coding (immediate=red, soon=amber, monitor=blue)
- Data sources indicator
- Time horizon label

---

## Implementation Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useAlertThrottling.ts` | Create | Alert throttling and grouping logic |
| `src/utils/analyticsExport.ts` | Create | CSV/PDF export utilities |
| `src/components/analytics/ExportDialog.tsx` | Create | Export options modal |
| `supabase/functions/ai-analytics/index.ts` | Update | Enhanced schema, prompt, and data processing |
| `src/components/analytics/executive/EnhancedAIInsights.tsx` | Update | New insight format display, throttling |
| `src/components/analytics/executive/ExecutiveInsightsTab.tsx` | Update | Add export button |
| `src/components/analytics/customers/CustomerIntelligence.tsx` | Update | Add export button |
| `src/components/analytics/operations/OperationsIntelligence.tsx` | Update | Add export button |
| `src/components/analytics/audit/EnhancedAuditTimeline.tsx` | Update | Add export button |

---

## Technical Details

### Alert Throttling Storage Schema

```typescript
interface ThrottleState {
  [insightType: string]: {
    lastShown: string; // ISO timestamp
    snoozedUntil?: string;
    showCount: number;
  }
}
```

### Export PDF Structure

```text
Executive Analytics Report
--------------------------
Generated: [Date]
Period: [Date Range]

1. Key Metrics Summary
   - Cash at Risk: GHS X
   - Orders at Risk: X
   - Customer Health: X green, Y yellow, Z red

2. AI Insights (Top 5)
   - [Insight 1 with recommendation]
   - [Insight 2 with recommendation]
   ...

3. Recommended Actions (Prioritized)
   - [Action 1] - Expected Impact: GHS X
   - [Action 2] - Expected Impact: GHS Y
```

### AI System Prompt Guardrails

```text
Safety Rules:
- Never suggest legal actions against customers
- Never recommend terminating customer relationships
- Phrase recommendations as "Consider..." or "We recommend reviewing..."
- When confidence is below 70%, explicitly state uncertainty
- Default tone: calm, professional, advisory
```

---

## Dependencies

No new packages required. Uses existing:
- `papaparse` for CSV generation
- `@react-pdf/renderer` or native browser print for PDF (recommend browser print-to-PDF for simplicity)

---

## Testing Checklist

After implementation:
1. Verify alert throttling prevents duplicate notifications within 24h
2. Test insight grouping with 5+ similar insights
3. Export CSV and verify column headers and data accuracy
4. Generate PDF and verify formatting
5. Call AI analytics endpoint and verify new structured output format
6. Test urgency color coding matches specification
7. Verify financial impact displays with confidence indicator

