-- =============================================
-- PHASE 1: RLS HARDENING
-- =============================================

-- 1.1 Fix supplier_products - restrict to admins only
DROP POLICY IF EXISTS "Authenticated users can view supplier products" ON public.supplier_products;

CREATE POLICY "Only admins can view supplier products"
ON public.supplier_products
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- 1.2 Fix quote_request_items - keep existing but add protection
DROP POLICY IF EXISTS "Anyone can insert quote request items" ON public.quote_request_items;

CREATE POLICY "Quote request items can be inserted for valid requests"
ON public.quote_request_items
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quote_requests qr 
    WHERE qr.id = quote_request_id 
    AND qr.created_at > now() - interval '24 hours'
  )
);

-- 1.3 Fix quotes - remove overly permissive policy
DROP POLICY IF EXISTS "Users can manage quotes" ON public.quotes;

-- 1.4 Fix quote_items - tighten access
DROP POLICY IF EXISTS "Users can view quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Users can insert quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Users can update quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Users can delete quote items" ON public.quote_items;

-- Customers can only view quote_items for their quotes
CREATE POLICY "Customers can view their quote items"
ON public.quote_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_id
    AND (
      q.customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      OR q.customer_id IN (
        SELECT c.id FROM public.customers c 
        JOIN public.customer_users cu ON cu.customer_id = c.id
        WHERE cu.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  )
);

-- Only admins can insert/update/delete quote items
CREATE POLICY "Admins can insert quote items"
ON public.quote_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "Admins can update quote items"
ON public.quote_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "Admins can delete quote items"
ON public.quote_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- =============================================
-- PHASE 2: ORDER ISSUES TABLE
-- =============================================

-- Create issue type enum
DO $$ BEGIN
  CREATE TYPE public.order_issue_type AS ENUM (
    'missing_items', 
    'damaged_items', 
    'wrong_items', 
    'late_delivery', 
    'quality_issue',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create issue status enum  
DO $$ BEGIN
  CREATE TYPE public.order_issue_status AS ENUM (
    'submitted',
    'reviewing', 
    'resolved',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create order_issues table
CREATE TABLE IF NOT EXISTS public.order_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  issue_type public.order_issue_type NOT NULL,
  description TEXT NOT NULL,
  photos TEXT[] DEFAULT '{}',
  status public.order_issue_status NOT NULL DEFAULT 'submitted',
  admin_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_issues ENABLE ROW LEVEL SECURITY;

-- Customers can view their own issues
CREATE POLICY "Customers can view their own order issues"
ON public.order_issues
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT cu.customer_id FROM public.customer_users cu 
    WHERE cu.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Customers can create issues for their own orders (shipped or delivered)
CREATE POLICY "Customers can create order issues"
ON public.order_issues
FOR INSERT
TO authenticated
WITH CHECK (
  customer_id IN (
    SELECT cu.customer_id FROM public.customer_users cu 
    WHERE cu.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_id 
    AND o.customer_id = customer_id
    AND o.status IN ('shipped', 'delivered', 'delivery_failed')
  )
);

-- Admins can manage all issues
CREATE POLICY "Admins can update order issues"
ON public.order_issues
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "Admins can delete order issues"
ON public.order_issues
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_issues_order_id ON public.order_issues(order_id);
CREATE INDEX IF NOT EXISTS idx_order_issues_customer_id ON public.order_issues(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_issues_status ON public.order_issues(status);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_order_issues_updated_at ON public.order_issues;
CREATE TRIGGER update_order_issues_updated_at
  BEFORE UPDATE ON public.order_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function for logging issue status changes
CREATE OR REPLACE FUNCTION public.log_order_issue_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (
      user_id,
      event_type,
      action,
      resource_type,
      resource_id,
      event_data,
      severity
    ) VALUES (
      auth.uid(),
      'order_issue_status_change',
      'update',
      'order_issues',
      NEW.id::text,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'order_id', NEW.order_id,
        'admin_notes', NEW.admin_notes
      ),
      'info'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_order_issue_status ON public.order_issues;
CREATE TRIGGER log_order_issue_status
  AFTER UPDATE ON public.order_issues
  FOR EACH ROW
  EXECUTE FUNCTION log_order_issue_status_change();