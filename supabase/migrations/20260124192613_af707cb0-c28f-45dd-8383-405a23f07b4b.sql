-- Fix the Security Definer View issue by recreating with security_invoker=on
-- This ensures RLS policies are checked using the querying user's permissions

-- Drop the existing view
DROP VIEW IF EXISTS public.public_product_catalog;

-- Recreate the view with security_invoker enabled
CREATE VIEW public.public_product_catalog
WITH (security_invoker=on) AS
SELECT 
    id,
    name,
    slug,
    description,
    category,
    brand,
    price_unit,
    unit_price,
    price_currency,
    image_public_url,
    is_active,
    created_at,
    updated_at
FROM supplier_products
WHERE is_active = true;

-- Grant SELECT access on the view to authenticated and anon roles
GRANT SELECT ON public.public_product_catalog TO authenticated;
GRANT SELECT ON public.public_product_catalog TO anon;