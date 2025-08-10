-- Ensure all tables have RLS enabled
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Check if other required tables exist and create them with RLS
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id),
    name TEXT NOT NULL,
    description TEXT,
    stage TEXT DEFAULT 'qualification',
    value NUMERIC DEFAULT 0,
    probability INTEGER DEFAULT 50,
    expected_close_date DATE,
    actual_close_date DATE,
    assigned_to UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    close_reason TEXT,
    source TEXT
);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id),
    lead_id UUID REFERENCES public.leads(id),
    supplier_id UUID,
    quote_number TEXT NOT NULL,
    title TEXT NOT NULL,
    total_amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'draft',
    valid_until DATE,
    terms TEXT,
    notes TEXT,
    file_url TEXT,
    final_file_url TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id),
    lead_id UUID REFERENCES public.leads(id),
    order_id UUID,
    type communication_type NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    direction TEXT,
    contact_person TEXT,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id),
    lead_id UUID REFERENCES public.leads(id),
    activity_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    activity_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'completed',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create policies for opportunities
DROP POLICY IF EXISTS "Users can view opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can insert opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can update opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Admins can delete opportunities" ON public.opportunities;

CREATE POLICY "Users can view opportunities" ON public.opportunities FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert opportunities" ON public.opportunities FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update opportunities" ON public.opportunities FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete opportunities" ON public.opportunities FOR DELETE USING (check_user_role(auth.uid(), 'admin'));

-- Create policies for quotes
DROP POLICY IF EXISTS "Users can view quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can delete quotes" ON public.quotes;

CREATE POLICY "Users can view quotes" ON public.quotes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert quotes" ON public.quotes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update quotes" ON public.quotes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete quotes" ON public.quotes FOR DELETE USING (check_user_role(auth.uid(), 'admin'));

-- Create policies for communications
DROP POLICY IF EXISTS "Users can view communications" ON public.communications;
DROP POLICY IF EXISTS "Users can insert communications" ON public.communications;
DROP POLICY IF EXISTS "Users can update communications" ON public.communications;
DROP POLICY IF EXISTS "Admins can delete communications" ON public.communications;

CREATE POLICY "Users can view communications" ON public.communications FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert communications" ON public.communications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update communications" ON public.communications FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete communications" ON public.communications FOR DELETE USING (check_user_role(auth.uid(), 'admin'));

-- Create policies for activities
DROP POLICY IF EXISTS "Users can view activities" ON public.activities;
DROP POLICY IF EXISTS "Users can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can delete activities" ON public.activities;

CREATE POLICY "Users can view activities" ON public.activities FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert activities" ON public.activities FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update activities" ON public.activities FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete activities" ON public.activities FOR DELETE USING (check_user_role(auth.uid(), 'admin'));

-- Create remaining update triggers
DROP TRIGGER IF EXISTS update_opportunities_updated_at ON public.opportunities;
DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
DROP TRIGGER IF EXISTS update_activities_updated_at ON public.activities;

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();