
# Business Intelligence Page Integrity & Link Reliability Refactor

## Executive Summary

This plan performs a comprehensive integrity audit of the Business Intelligence page to ensure all interactive elements work correctly, metrics are accurate, and the page is production-ready for enterprise use. The audit identified **27 issues** across 5 tabs requiring fixes.

---

## Current State: Action & Link Inventory

### Tab 1: Executive Insights

| UI Action | Intended Destination | Status | Issue |
|-----------|---------------------|--------|-------|
| "Review payments" KPI button | `/orders?filter=pending_payment` | **BROKEN** | Route doesn't support `filter` query param |
| "View orders" KPI button | `/orders?filter=at_risk` | **BROKEN** | Route doesn't support `filter` query param |
| "Review customers" KPI button | `/customers?filter=at_risk` | **BROKEN** | Route doesn't support `filter` query param |
| "Explore opportunities" KPI button | `/customers?filter=growing` | **BROKEN** | Route doesn't support `filter` query param |
| "Take Action" button on AI insights | None | **BROKEN** | Button does nothing - no handler attached |
| "Export" button | Export dialog | **WORKS** | ✅ |
| "ai_insights" export option | Available in dialog | **BROKEN** | Handler doesn't process `ai_insights` option |
| "Refresh" AI insights button | Refetches data | **WORKS** | ✅ |
| "Snooze 24h" button | Snoozes insight | **WORKS** | ✅ |

### Tab 2: Customer & Revenue Intelligence

| UI Action | Intended Destination | Status | Issue |
|-----------|---------------------|--------|-------|
| Arrow button on customer cards | None | **BROKEN** | `<Button>` with no onClick handler |
| "Export" button | Export dialog | **WORKS** | ✅ |
| Customer cards (Top Revenue) | Should open customer | **MISSING** | No drill-down to customer detail |
| Customer cards (At Risk) | Should open customer | **MISSING** | No drill-down to customer detail |
| Customer cards (Growth) | Should open customer | **MISSING** | No drill-down to customer detail |

### Tab 3: Operations & Risk Intelligence

| UI Action | Intended Destination | Status | Issue |
|-----------|---------------------|--------|-------|
| Order rows in "Orders at Risk" | Should open order | **MISSING** | No click handler or view button |
| Issue pattern "Recent: ORD-xxx" | Should filter orders | **MISSING** | Order numbers are plain text |
| "Export" button | Export dialog | **WORKS** | ✅ |

### Tab 4: Automation & Alerts

| UI Action | Intended Destination | Status | Issue |
|-----------|---------------------|--------|-------|
| "Create Rule" button | None | **BROKEN** | Button does nothing |
| "Save Changes" button | Shows toast only | **MISLEADING** | Rules NOT persisted to database |
| Toggle switches | Local state only | **MISLEADING** | Changes lost on page refresh |
| "Enable" on recommendations | Adds to local array | **MISLEADING** | Not persisted |

### Tab 5: Audit & History

| UI Action | Intended Destination | Status | Issue |
|-----------|---------------------|--------|-------|
| Activity items with order/quote | Should link to entity | **MISSING** | No drill-down capability |
| "Export" button | Export dialog | **WORKS** | ✅ |
| "Refresh" button | Refetches data | **WORKS** | ✅ |

---

## Phase 1: Fix KPI Navigation Links (ActionKPIs.tsx)

**Problem**: All 4 KPI action buttons use broken routes like `/orders?filter=pending_payment`

**Solution**: Replace button navigation with drawer/modal drill-downs showing relevant data inline.

**Changes to `src/components/analytics/executive/ActionKPIs.tsx`:**

1. Remove unused `actionLink` property from KPIs (lines 148, 158, 168, 178)
2. Add state for selected KPI modal
3. Replace `<button>` elements with proper handlers that open an inline drawer showing:
   - **Cash at Risk**: Orders with `status === 'pending_payment'`
   - **Orders at Risk**: Orders matching risk criteria
   - **Customers at Risk**: Customers with declining health scores
   - **Growth Opportunities**: Growing customers

4. Create new component: `src/components/analytics/executive/KPIDrilldownDrawer.tsx`
   - Shows filtered list of orders/customers based on KPI type
   - Includes "View in Orders/Customers" link to full admin page
   - Allows quick actions (send reminder, view details)

---

## Phase 2: Fix AI Insight "Take Action" Button (EnhancedAIInsights.tsx)

**Problem**: "Take Action" button at line 547-550 has no handler

**Solution**: Wire button to context-appropriate action based on insight type

**Changes to `src/components/analytics/executive/EnhancedAIInsights.tsx`:**

1. Add `onTakeAction` handler function:
```typescript
const handleTakeAction = (insight: StructuredInsight) => {
  switch (insight.type) {
    case 'risk':
      // Open orders drawer filtered to at-risk
      setShowRiskDrawer(true);
      break;
    case 'opportunity':
      // Navigate to quotes/customers
      navigate('/admin/customers');
      break;
    case 'optimization':
      // Show optimization suggestions modal
      toast.info("Review recommendation details above");
      break;
    default:
      toast.info("Review the recommended action above");
  }
};
```

2. Update button (line 547):
```tsx
<Button size="sm" className="flex-1" onClick={() => handleTakeAction(insight)}>
  Take Action
  <ChevronRight className="h-3 w-3 ml-1" />
</Button>
```

3. For insights without actionable routes, change button to "View Details" and ensure the collapsible is open

---

## Phase 3: Fix Missing ai_insights Export Handler

**Problem**: `ai_insights` is in `availableOptions` but not handled in `handleExport`

**Solution**: Add handler case in `ExecutiveInsightsTab.tsx`

**Changes to `src/components/analytics/executive/ExecutiveInsightsTab.tsx`:**

Add missing case (after line 87):
```typescript
case 'ai_insights':
  // Re-use the existing executive summary export with insights
  const aiInsights: InsightData[] = orders
    .filter(o => o.status === 'pending_payment')
    .slice(0, 5)
    .map(o => ({
      type: 'risk',
      title: `Order ${o.order_number} pending payment`,
      summary: `Amount: GHS ${o.total_amount}`,
      recommended_action: 'Send payment reminder',
      urgency: 'soon'
    }));
  exportAIInsightsReport(aiInsights);
  break;
```

Add import: `import { exportAIInsightsReport } from '@/utils/analyticsExport';`

---

## Phase 4: Fix Customer Card Drill-downs (CustomerIntelligence.tsx)

**Problem**: Arrow buttons on customer cards have no handlers

**Solution**: Add navigation to unified customer view

**Changes to `src/components/analytics/customers/CustomerIntelligence.tsx`:**

1. Add useNavigate hook
2. Update arrow button (line 351-353):
```tsx
<Button 
  variant="ghost" 
  size="sm" 
  className="h-7 w-7 p-0"
  onClick={() => navigate('/admin/customers', { 
    state: { viewCustomerId: customer.customerId } 
  })}
>
  <ArrowRight className="h-4 w-4" />
</Button>
```

3. Similarly update all customer cards in:
   - Top Customers section (line 351)
   - At Risk Customers section (make entire card clickable)
   - Growth Opportunities section (add view action)

---

## Phase 5: Fix Operations At-Risk Orders (OperationsIntelligence.tsx)

**Problem**: At-risk order rows have no click handler to view order

**Solution**: Add navigation to orders with highlight

**Changes to `src/components/analytics/operations/OperationsIntelligence.tsx`:**

1. Add useNavigate hook
2. Wrap order item (around line 459) with click handler:
```tsx
<motion.div
  ...
  className="... cursor-pointer hover:bg-red-100"
  onClick={() => navigate('/admin/orders', { 
    state: { highlightOrderId: order.id } 
  })}
>
```

3. Add "View Order" button for clarity

---

## Phase 6: Automation Tab Honesty Pass (InsightDrivenAutomation.tsx)

**Problem**: UI implies rules are saved/active but they only exist in local React state

**Solution**: Add clear warning banner and disable deceptive actions

**Changes to `src/components/analytics/automation/InsightDrivenAutomation.tsx`:**

1. Add warning banner at top (after line 225):
```tsx
<Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
  <CardContent className="p-4 flex items-center gap-3">
    <AlertTriangle className="h-5 w-5 text-amber-600" />
    <div>
      <p className="font-medium text-sm">Preview Mode</p>
      <p className="text-xs text-muted-foreground">
        Automation rules are in preview. Enable persistence in settings to activate.
      </p>
    </div>
  </CardContent>
</Card>
```

2. Update "Save Changes" button to show tooltip:
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button size="sm" onClick={saveWorkflows} disabled>
        <Save className="h-4 w-4 mr-2" />
        Save Changes
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Coming soon: Database persistence for automation rules</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

3. Add "Preview" badge to each rule card header

4. Disable "Create Rule" button with tooltip:
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline" size="sm" disabled>
        <Plus className="h-4 w-4 mr-2" />
        Create Rule
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Custom rule creation coming soon</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## Phase 7: Fix Audit Timeline Drill-downs (EnhancedAuditTimeline.tsx)

**Problem**: Activity items showing order/quote numbers are not clickable

**Solution**: Make entity references into links

**Changes to `src/components/analytics/audit/EnhancedAuditTimeline.tsx`:**

1. Add useNavigate hook
2. Update order/quote display (lines 402-410):
```tsx
{activity.event_data.order_number && (
  <button
    className="font-medium text-foreground hover:text-primary underline-offset-2 hover:underline"
    onClick={() => navigate('/admin/orders', {
      state: { highlightOrderId: activity.event_data.order_id }
    })}
  >
    Order: {activity.event_data.order_number}
  </button>
)}
{activity.event_data.quote_number && (
  <button
    className="font-medium text-foreground hover:text-primary underline-offset-2 hover:underline"
    onClick={() => navigate('/admin/quotes', {
      state: { highlightQuoteId: activity.event_data.quote_id }
    })}
  >
    Quote: {activity.event_data.quote_number}
  </button>
)}
```

---

## Phase 8: Add Empty States for Edge Cases

**Changes across all tab components:**

1. **EnhancedAIInsights.tsx**: Already has empty state ✅
2. **CustomerIntelligence.tsx**: Already has empty state for at-risk section ✅
3. **OperationsIntelligence.tsx**: Add empty state for "No orders at risk":
```tsx
{ordersAtRisk.length === 0 && (
  <div className="text-center py-8 text-muted-foreground">
    <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
    <p className="text-sm font-medium">All orders on track</p>
    <p className="text-xs">No deliveries are at risk of missing SLA</p>
  </div>
)}
```

4. **ActionKPIs.tsx**: Show "All clear" state when all KPIs are neutral
5. **ExecutiveSummary.tsx**: Already has fallback insight ✅

---

## Phase 9: Create Shared KPI Drill-down Drawer

**New File: `src/components/analytics/shared/KPIDrilldownDrawer.tsx`**

A reusable drawer component for showing filtered entity lists:

```typescript
interface KPIDrilldownDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  type: 'orders' | 'customers';
  items: any[];
  onViewAll: () => void;
}
```

Features:
- Shows up to 10 items inline
- "View All in [Orders/Customers]" button at bottom
- Quick actions per item (send reminder, view details)
- Mobile-responsive sheet variant

---

## Implementation Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/components/analytics/executive/ActionKPIs.tsx` | Modify | Remove broken links, add drawer handlers |
| `src/components/analytics/executive/EnhancedAIInsights.tsx` | Modify | Wire "Take Action" button |
| `src/components/analytics/executive/ExecutiveInsightsTab.tsx` | Modify | Add ai_insights export handler |
| `src/components/analytics/customers/CustomerIntelligence.tsx` | Modify | Add customer card navigation |
| `src/components/analytics/operations/OperationsIntelligence.tsx` | Modify | Add at-risk order navigation |
| `src/components/analytics/automation/InsightDrivenAutomation.tsx` | Modify | Add preview warning, disable save |
| `src/components/analytics/audit/EnhancedAuditTimeline.tsx` | Modify | Make entity refs clickable |
| `src/components/analytics/shared/KPIDrilldownDrawer.tsx` | Create | Reusable drill-down component |

---

## Testing Checklist

After implementation:

1. **Executive Insights Tab**
   - [ ] Click each KPI action → Drawer opens with filtered data
   - [ ] Click "Take Action" on AI insight → Appropriate response
   - [ ] Export "AI Insights" → PDF opens in new tab
   - [ ] Snooze insight → Disappears, counter increments

2. **Customer Intelligence Tab**
   - [ ] Click arrow on customer → Opens customer detail view
   - [ ] Export customer health → CSV downloads with correct data

3. **Operations Tab**
   - [ ] Click at-risk order → Navigates to orders with order highlighted
   - [ ] All metrics show "Insufficient data" when no orders exist

4. **Automation Tab**
   - [ ] Warning banner is visible
   - [ ] Create Rule button shows tooltip
   - [ ] Save Changes button shows tooltip
   - [ ] All rule cards show "Preview" badge

5. **Audit Tab**
   - [ ] Click order number → Navigates to orders page
   - [ ] Click quote number → Navigates to quotes page

---

## Non-Goals (Confirmed)

- No UI redesign
- No new analytics features
- No new AI features  
- No business logic changes beyond correctness
- No automation backend implementation (just UI honesty)
