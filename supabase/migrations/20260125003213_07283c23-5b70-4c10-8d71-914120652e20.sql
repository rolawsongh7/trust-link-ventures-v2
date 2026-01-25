-- Function to auto-create customer_users mapping when a customer is created
CREATE OR REPLACE FUNCTION public.auto_create_customer_user_mapping()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if there's an auth user with matching email and create mapping
  INSERT INTO customer_users (customer_id, user_id)
  SELECT NEW.id, u.id
  FROM auth.users u
  WHERE LOWER(u.email) = LOWER(NEW.email)
  ON CONFLICT (customer_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS on_customer_created ON customers;

-- Trigger on customer creation to auto-create mapping
CREATE TRIGGER on_customer_created
  AFTER INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_customer_user_mapping();

-- Also create a function to repair missing mappings for existing customers
CREATE OR REPLACE FUNCTION public.repair_customer_user_mappings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fixed_count INTEGER := 0;
BEGIN
  INSERT INTO customer_users (customer_id, user_id)
  SELECT c.id, u.id
  FROM customers c
  JOIN auth.users u ON LOWER(u.email) = LOWER(c.email)
  WHERE NOT EXISTS (
    SELECT 1 FROM customer_users cu 
    WHERE cu.customer_id = c.id AND cu.user_id = u.id
  )
  ON CONFLICT (customer_id, user_id) DO NOTHING;
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RETURN fixed_count;
END;
$$;

-- Run the repair function immediately to fix existing users like Renata
SELECT public.repair_customer_user_mappings();