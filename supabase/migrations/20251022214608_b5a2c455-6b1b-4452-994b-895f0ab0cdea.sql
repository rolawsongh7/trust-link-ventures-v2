-- Step 1: Create function to merge duplicate customers
CREATE OR REPLACE FUNCTION merge_duplicate_customers(
  keep_id UUID,
  remove_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update all orders to point to the kept customer
  UPDATE orders SET customer_id = keep_id WHERE customer_id = remove_id;
  
  -- Update all invoices to point to the kept customer
  UPDATE invoices SET customer_id = keep_id WHERE customer_id = remove_id;
  
  -- Update all quotes to point to the kept customer
  UPDATE quotes SET customer_id = keep_id WHERE customer_id = remove_id;
  
  -- Update all activities to point to the kept customer
  UPDATE activities SET customer_id = keep_id WHERE customer_id = remove_id;
  
  -- Update all communications to point to the kept customer
  UPDATE communications SET customer_id = keep_id WHERE customer_id = remove_id;
  
  -- Update all customer addresses to point to the kept customer
  UPDATE customer_addresses SET customer_id = keep_id WHERE customer_id = remove_id;
  
  -- Delete the duplicate customer record
  DELETE FROM customers WHERE id = remove_id;
END;
$$;

-- Step 2: Merge Kwame Buabeng's duplicate records (if they exist)
DO $$
BEGIN
  -- Check if both IDs exist before merging
  IF EXISTS (SELECT 1 FROM customers WHERE id = '1c0b49f4-e21a-4ef7-8d76-a1693da7a4e3'::uuid) AND
     EXISTS (SELECT 1 FROM customers WHERE id = '3ea54cc0-8294-40cd-aea2-9ae11dcf53a0'::uuid) THEN
    PERFORM merge_duplicate_customers(
      '1c0b49f4-e21a-4ef7-8d76-a1693da7a4e3'::uuid,
      '3ea54cc0-8294-40cd-aea2-9ae11dcf53a0'::uuid
    );
    RAISE NOTICE 'Merged Kwame Buabeng duplicate records';
  END IF;
END $$;

-- Step 3: Find and merge any other duplicates
DO $$
DECLARE
  dup RECORD;
  keep_id UUID;
  remove_ids UUID[];
  remove_id UUID;
BEGIN
  FOR dup IN 
    SELECT 
      LOWER(email) as email_lower,
      array_agg(id ORDER BY created_at) as customer_ids,
      COUNT(*) as count
    FROM customers
    GROUP BY LOWER(email)
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the first (oldest) customer record
    keep_id := dup.customer_ids[1];
    
    -- Get all other IDs to remove
    remove_ids := dup.customer_ids[2:array_length(dup.customer_ids, 1)];
    
    -- Merge each duplicate into the kept record
    FOREACH remove_id IN ARRAY remove_ids
    LOOP
      PERFORM merge_duplicate_customers(keep_id, remove_id);
      RAISE NOTICE 'Merged duplicate customer: % into %', remove_id, keep_id;
    END LOOP;
  END LOOP;
END $$;

-- Step 4: Add unique constraint on email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique_idx 
ON customers (LOWER(email));

-- Step 5: Add comment explaining the constraint
COMMENT ON INDEX customers_email_unique_idx IS 
'Case-insensitive unique constraint on email to prevent duplicate customer records';