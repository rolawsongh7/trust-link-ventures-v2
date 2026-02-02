# Plan: Remove Debugging and Redundant Buttons from Invoice Page

## ✅ COMPLETED

All three super-admin-only buttons have been removed from the Invoice Management page:

| Button | Status | Notes |
|--------|--------|-------|
| **Storage Test (Beaker icon)** | ✅ Removed | Debug-only, no workflow impact |
| **Regenerate Missing PDFs** | ✅ Removed | Same functionality available in Settings > Super Admin via BulkPdfRegenerationCard |
| **Per-row Regenerate (RefreshCw icon)** | ✅ Removed from desktop | Mobile views (MobileInvoiceCard, MobileInvoiceDetailDialog) still have regenerate option |

## Invoice Page Now Shows
- **Preview** button (Eye icon) - Opens PDF preview dialog
- **Download** button - Downloads the PDF

## PDF Regeneration Still Available Via
1. **Settings > Super Admin > Bulk PDF Regeneration Card** - Regenerate by date range
2. **Mobile Invoice Detail Dialog** - Single invoice regeneration for mobile users

## Files Modified
- `src/components/admin/InvoiceManagement.tsx` - Removed Beaker import, handleTestStorage, handleRegenerateMissingPDFs, regeneratingAll state, and super-admin action buttons

