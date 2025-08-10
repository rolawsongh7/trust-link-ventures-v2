-- Create a bypass function for quote request insertions
-- This will temporarily disable RLS for specific operations

-- First, let's create a function that can bypass RLS for customer creation
CREATE OR REPLACE FUNCTION public.create_customer_for_quote(
  p_company_name TEXT,
  p_contact_name TEXT,
  p_email TEXT,
  p_country TEXT,
  p_industry TEXT DEFAULT 'Food & Beverage',
  p_notes TEXT DEFAULT ''
) RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  customer_id UUID;
BEGIN
  INSERT INTO public.customers (
    company_name,
    contact_name,
    email,
    country,
    industry,
    customer_status,
    priority,
    notes
  ) VALUES (
    p_company_name,
    p_contact_name,
    p_email,
    p_country,
    p_industry,
    'prospect',
    'high',
    p_notes
  ) RETURNING id INTO customer_id;
  
  RETURN customer_id;
END;
$$;

-- Create a function that can bypass RLS for lead creation
CREATE OR REPLACE FUNCTION public.create_lead_for_quote(
  p_customer_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_source TEXT DEFAULT 'product_quote_form',
  p_lead_score INTEGER DEFAULT 70
) RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  lead_id UUID;
BEGIN
  INSERT INTO public.leads (
    customer_id,
    title,
    description,
    source,
    status,
    lead_score
  ) VALUES (
    p_customer_id,
    p_title,
    p_description,
    p_source,
    'new',
    p_lead_score
  ) RETURNING id INTO lead_id;
  
  RETURN lead_id;
END;
$$;