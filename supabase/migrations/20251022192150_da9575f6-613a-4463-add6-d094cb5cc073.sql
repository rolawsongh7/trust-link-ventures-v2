-- Migration: Implement Role-Based Access Control for Customers Table (Simplified)

-- Part 1: Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Users can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can create customer records" ON public.customers;

-- Part 2: Create trigger to auto-set created_by for NEW records
CREATE OR REPLACE FUNCTION public.set_customer_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-set created_by to the current user if not already set
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS customer_set_creator ON public.customers;
CREATE TRIGGER customer_set_creator
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_customer_creator();

-- Part 3: Create new role-based SELECT policy
-- NULL created_by records (legacy data) are only visible to admins
CREATE POLICY "Role-based customer viewing"
ON public.customers
FOR SELECT
TO authenticated
USING (
  -- Admins can view all customers (including those with NULL created_by)
  check_user_role(auth.uid(), 'admin') OR
  -- Sales reps can view customers they're assigned to or created
  (check_user_role(auth.uid(), 'sales_rep') AND 
   (assigned_to = auth.uid() OR created_by = auth.uid())) OR
  -- Regular users can only view customers they created
  created_by = auth.uid()
);

-- Part 4: Create new INSERT policy
CREATE POLICY "Authenticated users can create customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Part 5: Create new UPDATE policy
CREATE POLICY "Users can update assigned customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  -- Admins can update all customers
  check_user_role(auth.uid(), 'admin') OR
  -- Sales reps can update customers they're assigned to or created  
  (check_user_role(auth.uid(), 'sales_rep') AND 
   (assigned_to = auth.uid() OR created_by = auth.uid())) OR
  -- Regular users can only update customers they created
  created_by = auth.uid()
)
WITH CHECK (
  -- Same conditions for the updated data
  check_user_role(auth.uid(), 'admin') OR
  (check_user_role(auth.uid(), 'sales_rep') AND 
   (assigned_to = auth.uid() OR created_by = auth.uid())) OR
  created_by = auth.uid()
);

-- Note: Existing customers with NULL created_by will only be visible to admins
-- They can manually assign these customers to sales reps using the 'assigned_to' field