-- Drop existing function and recreate with correct return type
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

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

-- Create leads table with enum
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');

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

-- Create communications table with enum
CREATE TYPE public.communication_type AS ENUM ('email', 'phone', 'meeting', 'note');

-- Enable RLS on quote_requests
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for quote_requests
CREATE POLICY "Anyone can view quote requests" ON public.quote_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can insert quote requests" ON public.quote_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage quote requests" ON public.quote_requests FOR ALL USING (check_user_role(auth.uid(), 'admin'));

-- Insert admin role for the main admin user
INSERT INTO public.user_roles (user_id, role) 
VALUES ('00000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_quote_requests_updated_at BEFORE UPDATE ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();