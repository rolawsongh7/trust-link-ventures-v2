
# Fix Quote Request Modal Scrolling & Content Visibility

## Problem Analysis

The Quote Request Details modal in the admin portal has a scrolling issue where users cannot scroll to view line items and full request details. The screenshot shows the content is clipped after the "Customer Information" section.

### Root Cause

The modal uses `ScrollArea` from Radix UI, which requires specific height constraints to function properly. The current implementation has:

1. `DialogContent` with `max-h-[90vh] flex flex-col p-0`
2. `DialogHeader` with `flex-shrink-0` (correct)
3. `ScrollArea` with `flex-1 min-h-0` (insufficient)
4. Footer with `flex-shrink-0` (correct)

The issue is that Radix's `ScrollAreaPrimitive.Viewport` has `h-full w-full`, which doesn't properly inherit height from a flexbox parent. The viewport needs an explicit `!h-auto` override or the ScrollArea needs a fixed `max-h` calculation.

---

## Solution Architecture

```text
+--------------------------------------------------+
|  DialogContent (max-h-[90vh] flex flex-col)      |
+--------------------------------------------------+
|  DialogHeader (flex-shrink-0)                    |
|  - Title, buttons, badge                         |
+--------------------------------------------------+
|  ScrollArea (flex-1 min-h-0 overflow-hidden)     |
|  +--------------------------------------------+  |
|  | Viewport (overflow-y-auto)  <-- FIX HERE  |  |
|  | - Status bar                              |  |
|  | - Customer info                           |  |
|  | - Message card                            |  |
|  | - Admin notes                             |  |
|  | - Line items table                        |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
|  Footer (flex-shrink-0)                          |
|  - Hint text, action buttons                     |
+--------------------------------------------------+
```

---

## Implementation Changes

### Option A: Fix ScrollArea Viewport Height (Recommended)

**File: `src/components/ui/scroll-area.tsx`**

The Viewport needs to properly fill its flex container. Add explicit height handling:

```tsx
<ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] [&>div]:!block">
```

This won't fully fix it. Instead, we need to apply the fix at the component level.

### Option B: Replace ScrollArea with Native Scroll (Simpler)

Since the `ScrollArea` from Radix has viewport issues in flex containers, replace it with a simple `div` with `overflow-y-auto`:

**File: `src/components/QuoteRequestManagement.tsx`**

Change:
```tsx
<ScrollArea className="flex-1 min-h-0">
  {selectedRequest && (
    <div className="space-y-6 p-6 pb-4">
```

To:
```tsx
<div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
  {selectedRequest && (
    <div className="space-y-6 p-6 pb-4">
```

This is the **recommended fix** as it:
- Avoids Radix viewport height inheritance issues
- Provides native smooth scrolling
- Works correctly with flexbox layouts
- Supports touch/trackpad/keyboard scrolling

---

## Detailed Changes

### Change 1: Replace ScrollArea with Native Scroll Container

**File: `src/components/QuoteRequestManagement.tsx`**

At line 863, replace:
```tsx
<ScrollArea className="flex-1 min-h-0">
```

With:
```tsx
<div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth">
```

At line 1006, replace:
```tsx
</ScrollArea>
```

With:
```tsx
</div>
```

### Change 2: Remove Unused ScrollArea Import

Remove the `ScrollArea` import if no longer used elsewhere in the file.

### Change 3: Ensure Proper Height Calculation

The `DialogContent` already has `max-h-[90vh]`, but we should verify the footer spacing doesn't cause overflow. Add padding-bottom to the scroll container content:

At line 865, change:
```tsx
<div className="space-y-6 p-6 pb-4">
```

To:
```tsx
<div className="space-y-6 p-6 pb-6">
```

This ensures content doesn't get clipped at the bottom.

---

## Testing Checklist

After implementation, verify:

1. **Scroll Functionality**
   - [ ] Mouse wheel scrolling works
   - [ ] Trackpad scrolling works
   - [ ] Keyboard scrolling (arrow keys, space, page up/down) works
   - [ ] Touch scrolling works on mobile

2. **Content Visibility**
   - [ ] Status/Urgency/Type bar is visible
   - [ ] Customer Information card is fully visible
   - [ ] Customer Message card is visible
   - [ ] Admin Notes (if present) is visible
   - [ ] Requested Items table is visible with all rows
   - [ ] Table scrolls within modal on long item lists

3. **Fixed Sections**
   - [ ] Header (title, buttons) stays fixed at top
   - [ ] Footer (action buttons) stays fixed at bottom
   - [ ] Only the content area scrolls

4. **Edge Cases**
   - [ ] Modal works on small viewports (mobile)
   - [ ] Modal works on tall viewports (desktop)
   - [ ] Empty items state renders correctly
   - [ ] Loading state renders correctly

5. **Accessibility**
   - [ ] Focus trap works correctly
   - [ ] ESC closes the modal
   - [ ] Click outside closes the modal

---

## Files Modified

| File | Action | Description |
|------|--------|-------------|
| `src/components/QuoteRequestManagement.tsx` | Modify | Replace ScrollArea with native scroll div |

---

## Technical Notes

- The Radix `ScrollArea` component is designed for custom scrollbar styling, but has known issues with flexbox containers where the viewport doesn't properly inherit height
- Using native `overflow-y-auto` is the standard solution for flex-based modal layouts
- The `overscroll-contain` class prevents scroll chaining to the background page
- The `scroll-smooth` class provides smooth scrolling experience

## Non-Goals

- No UI redesign
- No changes to the data displayed
- No changes to action buttons or workflow
- No changes to styling beyond scroll behavior
