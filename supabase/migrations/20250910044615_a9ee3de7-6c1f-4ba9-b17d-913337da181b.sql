-- First check current role data
-- Add supplier role support to existing system
INSERT INTO public.user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'supplier@trustlinkventures.com' LIMIT 1), 
  'supplier'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Create suppliers table for supplier management if not exists
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

-- Create supplier dashboard stats view
CREATE OR REPLACE VIEW public.supplier_dashboard_stats AS
SELECT 
  s.id as supplier_id,
  s.name as supplier_name,
  COUNT(DISTINCT sp.id) as total_products,
  COUNT(DISTINCT CASE WHEN sp.is_active THEN sp.id END) as active_products,
  COALESCE(COUNT(DISTINCT qi.quote_id), 0) as total_quotes,
  COALESCE(COUNT(DISTINCT o.id), 0) as total_orders
FROM public.suppliers s
LEFT JOIN public.supplier_products sp ON s.name = sp.supplier
LEFT JOIN public.quote_items qi ON sp.name = qi.product_name
LEFT JOIN public.orders o ON qi.quote_id = o.quote_id
GROUP BY s.id, s.name;

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