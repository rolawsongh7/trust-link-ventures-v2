-- Add supplier role to the user roles system
CREATE TYPE public.user_role_enum AS ENUM ('admin', 'sales_rep', 'user', 'supplier');

-- Update user_roles table to use enum and add supplier support
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS role_enum user_role_enum;

-- Migrate existing text roles to enum
UPDATE public.user_roles 
SET role_enum = CASE 
  WHEN role = 'admin' THEN 'admin'::user_role_enum
  WHEN role = 'sales_rep' THEN 'sales_rep'::user_role_enum
  WHEN role = 'supplier' THEN 'supplier'::user_role_enum
  ELSE 'user'::user_role_enum
END;

-- Create suppliers table for supplier management
CREATE TABLE IF NOT EXISTS public.supplier_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  position TEXT,
  department TEXT,
  is_primary_contact BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, supplier_id)
);

-- Enable RLS on supplier_users
ALTER TABLE public.supplier_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for supplier_users
CREATE POLICY "Supplier users can view their own supplier data"
ON public.supplier_users FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all supplier users"
ON public.supplier_users FOR ALL
USING (check_user_role(auth.uid(), 'admin'));

-- Update check_user_role function to support supplier role
CREATE OR REPLACE FUNCTION public.check_user_role(check_user_id uuid, required_role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = check_user_id 
    AND (role::text = required_role OR role_enum::text = required_role)
  );
$$;

-- Create supplier dashboard stats view
CREATE OR REPLACE VIEW public.supplier_dashboard_stats AS
SELECT 
  s.id as supplier_id,
  s.name as supplier_name,
  COUNT(DISTINCT sp.id) as total_products,
  COUNT(DISTINCT CASE WHEN sp.is_active THEN sp.id END) as active_products,
  COUNT(DISTINCT qi.quote_id) as total_quotes,
  COUNT(DISTINCT o.id) as total_orders
FROM public.suppliers s
LEFT JOIN public.supplier_products sp ON s.id = sp.supplier_id
LEFT JOIN public.quote_items qi ON sp.name = qi.product_name
LEFT JOIN public.orders o ON qi.quote_id = o.quote_id
GROUP BY s.id, s.name;

-- RLS for supplier dashboard stats
ALTER VIEW public.supplier_dashboard_stats SET (security_barrier = true);

-- Create function to get supplier for user
CREATE OR REPLACE FUNCTION public.get_user_supplier_id(user_id_param UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supplier_id_result UUID;
BEGIN
  SELECT supplier_id INTO supplier_id_result
  FROM public.supplier_users
  WHERE user_id = user_id_param
  LIMIT 1;
  
  RETURN supplier_id_result;
END;
$$;