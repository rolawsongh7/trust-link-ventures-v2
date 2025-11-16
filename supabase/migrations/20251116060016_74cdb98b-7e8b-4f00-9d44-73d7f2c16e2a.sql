-- Fix duplicate order creation from quotes
-- The issue: Two triggers exist that both convert accepted quotes to orders
-- 1. auto_convert_quote_to_order_trigger (old, no WHEN clause)
-- 2. convert_quote_to_order_trigger (newer, with WHEN clause)
-- Solution: Keep only the newer one with the WHEN clause for better performance

-- Drop the old trigger that doesn't have a WHEN clause
DROP TRIGGER IF EXISTS auto_convert_quote_to_order_trigger ON quotes;

-- Keep the newer trigger with WHEN clause (already exists from migration 20251007072831)
-- This trigger only fires when status changes to 'accepted' for the first time
-- TRIGGER: convert_quote_to_order_trigger
--   WHEN (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted'))
--   EXECUTE FUNCTION auto_convert_quote_to_order();