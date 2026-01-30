-- Phase 2.1: Add ownership fields for staff assignment
-- Assignment is INFORMATIONAL ONLY - does not change permissions

-- Add assigned_to to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add assigned_to to quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add assigned_to to order_issues table
ALTER TABLE public.order_issues 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for filtering by assignee
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_quotes_assigned_to ON public.quotes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_order_issues_assigned_to ON public.order_issues(assigned_to);

-- Comment on columns for documentation
COMMENT ON COLUMN public.orders.assigned_to IS 'Staff member assigned to this order (informational only, does not affect RLS)';
COMMENT ON COLUMN public.quotes.assigned_to IS 'Staff member assigned to this quote (informational only, does not affect RLS)';
COMMENT ON COLUMN public.order_issues.assigned_to IS 'Staff member assigned to this issue (informational only, does not affect RLS)';