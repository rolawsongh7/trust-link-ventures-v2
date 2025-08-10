-- Create quote_requests table for managing customer quote requests
CREATE TABLE public.quote_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type TEXT NOT NULL DEFAULT 'customer' CHECK (request_type IN ('customer', 'lead')),
  title TEXT NOT NULL,
  message TEXT,
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'quoted', 'converted', 'declined')),
  expected_delivery_date DATE,
  customer_id UUID REFERENCES public.customers(id),
  -- Fields for lead requests (when request_type = 'lead')
  lead_company_name TEXT,
  lead_contact_name TEXT,
  lead_email TEXT,
  lead_phone TEXT,
  lead_country TEXT,
  lead_industry TEXT,
  -- Admin fields
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quote_request_items table for items within quote requests
CREATE TABLE public.quote_request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'kg',
  specifications TEXT,
  preferred_grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quote_items table for items within quotes
CREATE TABLE public.quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'kg',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  specifications TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quote_requests
CREATE POLICY "Anyone can insert quote requests" 
ON public.quote_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view quote requests" 
ON public.quote_requests 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update quote requests" 
ON public.quote_requests 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete quote requests" 
ON public.quote_requests 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'admin');

-- Create RLS policies for quote_request_items
CREATE POLICY "Anyone can insert quote request items" 
ON public.quote_request_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view quote request items" 
ON public.quote_request_items 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update quote request items" 
ON public.quote_request_items 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete quote request items" 
ON public.quote_request_items 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for quote_items
CREATE POLICY "Users can insert quote items" 
ON public.quote_items 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view quote items" 
ON public.quote_items 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update quote items" 
ON public.quote_items 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete quote items" 
ON public.quote_items 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_quote_requests_updated_at
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_quote_requests_customer_id ON public.quote_requests(customer_id);
CREATE INDEX idx_quote_requests_status ON public.quote_requests(status);
CREATE INDEX idx_quote_requests_created_at ON public.quote_requests(created_at DESC);
CREATE INDEX idx_quote_request_items_quote_request_id ON public.quote_request_items(quote_request_id);
CREATE INDEX idx_quote_items_quote_id ON public.quote_items(quote_id);