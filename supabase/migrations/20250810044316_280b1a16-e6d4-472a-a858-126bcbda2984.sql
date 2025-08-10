-- Create user role enum
CREATE TYPE public.user_role AS ENUM ('admin', 'user', 'moderator');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles (simplified to avoid recursion)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Create helper function to check user roles
CREATE OR REPLACE FUNCTION public.check_user_role(check_user_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = check_user_id AND role::text = required_role
  );
$$;

-- Create customers table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    country TEXT,
    industry TEXT DEFAULT 'Food & Beverage',
    customer_status TEXT DEFAULT 'prospect',
    priority TEXT DEFAULT 'medium',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create leads table with enum
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');

CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id),
    title TEXT NOT NULL,
    description TEXT,
    status lead_status DEFAULT 'new',
    value NUMERIC,
    probability INTEGER,
    expected_close_date DATE,
    assigned_to UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_activity_date DATE,
    lead_score INTEGER DEFAULT 0,
    next_follow_up_date DATE,
    currency TEXT DEFAULT 'USD',
    source TEXT
);

-- Create opportunities table
CREATE TABLE public.opportunities (
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

-- Create quote_requests table
CREATE TABLE public.quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID,
    request_type TEXT NOT NULL,
    lead_company_name TEXT,
    lead_contact_name TEXT,
    lead_email TEXT,
    lead_phone TEXT,
    lead_country TEXT,
    lead_industry TEXT,
    title TEXT NOT NULL,
    message TEXT,
    urgency TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    expected_delivery_date DATE,
    assigned_to UUID,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create quotes table
CREATE TABLE public.quotes (
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

-- Create communications table with enum
CREATE TYPE public.communication_type AS ENUM ('email', 'phone', 'meeting', 'note');

CREATE TABLE public.communications (
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

-- Create activities table
CREATE TABLE public.activities (
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

-- Enable RLS on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Users can view customers" ON public.customers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert customers" ON public.customers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update customers" ON public.customers FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete customers" ON public.customers FOR DELETE USING (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view leads" ON public.leads FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert leads" ON public.leads FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update leads" ON public.leads FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete leads" ON public.leads FOR DELETE USING (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view opportunities" ON public.opportunities FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert opportunities" ON public.opportunities FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update opportunities" ON public.opportunities FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete opportunities" ON public.opportunities FOR DELETE USING (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view quote requests" ON public.quote_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can insert quote requests" ON public.quote_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage quote requests" ON public.quote_requests FOR ALL USING (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view quotes" ON public.quotes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert quotes" ON public.quotes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update quotes" ON public.quotes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete quotes" ON public.quotes FOR DELETE USING (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view communications" ON public.communications FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert communications" ON public.communications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update communications" ON public.communications FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete communications" ON public.communications FOR DELETE USING (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view activities" ON public.activities FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert activities" ON public.activities FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update activities" ON public.activities FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete activities" ON public.activities FOR DELETE USING (check_user_role(auth.uid(), 'admin'));

-- Insert admin role for the main admin user
INSERT INTO public.user_roles (user_id, role) 
VALUES ('00000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quote_requests_updated_at BEFORE UPDATE ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();