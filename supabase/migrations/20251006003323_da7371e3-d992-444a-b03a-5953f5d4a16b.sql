-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('proforma', 'commercial', 'packing_list')),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  payment_terms TEXT,
  notes TEXT,
  file_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Admins can manage all invoices"
ON public.invoices
FOR ALL
TO authenticated
USING (check_user_role(auth.uid(), 'admin'::text))
WITH CHECK (check_user_role(auth.uid(), 'admin'::text));

CREATE POLICY "Customers can view their own invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT id FROM customers 
    WHERE email = (auth.jwt() ->> 'email'::text)
  )
);

-- RLS Policies for invoice_items
CREATE POLICY "Admins can manage invoice items"
ON public.invoice_items
FOR ALL
TO authenticated
USING (check_user_role(auth.uid(), 'admin'::text))
WITH CHECK (check_user_role(auth.uid(), 'admin'::text));

CREATE POLICY "Customers can view their own invoice items"
ON public.invoice_items
FOR SELECT
TO authenticated
USING (
  invoice_id IN (
    SELECT id FROM invoices
    WHERE customer_id IN (
      SELECT id FROM customers 
      WHERE email = (auth.jwt() ->> 'email'::text)
    )
  )
);

-- Create indexes
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX idx_invoices_quote_id ON public.invoices(quote_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(invoice_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prefix TEXT;
  counter INTEGER;
  generated_number TEXT;
BEGIN
  -- Set prefix based on invoice type
  prefix := CASE 
    WHEN invoice_type = 'proforma' THEN 'PI'
    WHEN invoice_type = 'commercial' THEN 'INV'
    WHEN invoice_type = 'packing_list' THEN 'PL'
    ELSE 'DOC'
  END;
  
  -- Get the next counter for this month and type
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(
          invoice_number 
          FROM prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-(\d+)'
        ) AS INTEGER
      )
    ), 
    0
  ) + 1
  INTO counter
  FROM invoices
  WHERE invoice_number LIKE prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-%';
  
  -- Generate the invoice number
  generated_number := prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN generated_number;
END;
$$;

-- Trigger to auto-generate invoice number
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number(NEW.invoice_type);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_invoice_insert
BEFORE INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION set_invoice_number();

-- Add trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();