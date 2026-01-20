-- Add source and affected_items columns to order_issues table
ALTER TABLE public.order_issues 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'customer_portal';

ALTER TABLE public.order_issues
ADD COLUMN IF NOT EXISTS affected_items JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.order_issues.source IS 'Origin of the issue report: customer_portal, internal, admin';
COMMENT ON COLUMN public.order_issues.affected_items IS 'Array of order item IDs that are affected by this issue';