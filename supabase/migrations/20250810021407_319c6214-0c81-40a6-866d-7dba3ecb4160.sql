-- Create foundational CRM schema first

-- Create a function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create user roles function for RLS
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = user_id;
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'sales', 'user')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    country TEXT,
    website TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suppliers" ON public.suppliers
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage suppliers" ON public.suppliers
FOR ALL USING (auth.uid() IS NOT NULL);

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    website TEXT,
    industry TEXT,
    notes TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view customers" ON public.customers
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage customers" ON public.customers
FOR ALL USING (auth.uid() IS NOT NULL);

-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT,
    contact_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    source TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
    notes TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leads" ON public.leads
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage leads" ON public.leads
FOR ALL USING (auth.uid() IS NOT NULL);

-- Create quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id),
    title TEXT NOT NULL,
    description TEXT,
    total_amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    valid_until DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    file_url TEXT,
    final_file_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quotes" ON public.quotes
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage quotes" ON public.quotes
FOR ALL USING (auth.uid() IS NOT NULL);

-- Create communications table
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'phone', 'meeting', 'note')),
    subject TEXT,
    content TEXT,
    communication_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view communications" ON public.communications
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage communications" ON public.communications
FOR ALL USING (auth.uid() IS NOT NULL);

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communications_updated_at BEFORE UPDATE ON communications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();