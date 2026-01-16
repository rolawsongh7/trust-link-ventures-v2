-- Create quote_revisions table for tracking customer revision requests
CREATE TABLE public.quote_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  requested_by_user_id UUID,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'revised_sent', 'resolved', 'rejected')),
  request_type TEXT NOT NULL CHECK (request_type IN ('quantity_change', 'swap_items', 'delivery_change', 'other')),
  requested_changes JSONB NOT NULL DEFAULT '{}',
  customer_note TEXT,
  admin_note TEXT,
  revision_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_quote_revisions_quote_id ON public.quote_revisions(quote_id);
CREATE INDEX idx_quote_revisions_customer_id ON public.quote_revisions(customer_id);
CREATE INDEX idx_quote_revisions_status ON public.quote_revisions(status);

-- Enable RLS
ALTER TABLE public.quote_revisions ENABLE ROW LEVEL SECURITY;

-- Customer can view their own revision requests
CREATE POLICY "Customers can view own revisions"
  ON public.quote_revisions
  FOR SELECT
  USING (
    customer_id IN (
      SELECT cu.customer_id FROM public.customer_users cu WHERE cu.user_id = auth.uid()
    )
  );

-- Customer can create revision requests for their quotes
CREATE POLICY "Customers can create revisions"
  ON public.quote_revisions
  FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT cu.customer_id FROM public.customer_users cu WHERE cu.user_id = auth.uid()
    )
  );

-- Customer can update only submitted revisions (to cancel)
CREATE POLICY "Customers can update submitted revisions"
  ON public.quote_revisions
  FOR UPDATE
  USING (
    customer_id IN (
      SELECT cu.customer_id FROM public.customer_users cu WHERE cu.user_id = auth.uid()
    )
    AND status = 'submitted'
  );

-- Admin full access (via profiles role check)
CREATE POLICY "Admin full access to revisions"
  ON public.quote_revisions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
    )
  );

-- Create trigger for updating updated_at
CREATE TRIGGER update_quote_revisions_updated_at
  BEFORE UPDATE ON public.quote_revisions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-increment revision_number per quote
CREATE OR REPLACE FUNCTION public.set_revision_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.revision_number := (
    SELECT COALESCE(MAX(revision_number), 0) + 1
    FROM public.quote_revisions
    WHERE quote_id = NEW.quote_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_quote_revision_number
  BEFORE INSERT ON public.quote_revisions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_revision_number();