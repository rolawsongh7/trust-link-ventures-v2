-- Clean up duplicate orders: Keep first order, remove quote references from duplicates
-- For quote_id duplicates:

-- Quote 1b731eda-89fe-4f69-b1fd-6f8555018713: Keep 3c951865-0b11-4614-afe2-5fb5768ef795, remove from 6b4b2651-d445-4382-95d3-0cefaedc301b
UPDATE orders SET quote_id = NULL 
WHERE id = '6b4b2651-d445-4382-95d3-0cefaedc301b';

-- Quote 319e8c33-aa38-4983-acbd-07c159eb3ab4: Keep 8f67c865-159e-4f04-ba76-4dd82836a274, remove from others
UPDATE orders SET quote_id = NULL, source_quote_id = NULL 
WHERE id IN ('07905d08-212d-460b-9e48-fd3664f4bd7e', '7fd3efd8-c36e-40e1-9cb2-f5fca5b176c5');

-- Quote 83fca824-a561-4825-a10f-d55d5d0aea42: Keep be829b30-5b9d-4280-b451-cb3d76b98a6d, remove from 4a0d706a-c690-4a70-af4a-245632b2eb8e
UPDATE orders SET quote_id = NULL, source_quote_id = NULL 
WHERE id = '4a0d706a-c690-4a70-af4a-245632b2eb8e';

-- Update validate_quote_status_transition to include 'converted' as valid status
CREATE OR REPLACE FUNCTION public.validate_quote_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  valid_transitions jsonb := '{
    "draft": ["sent"],
    "sent": ["accepted", "rejected", "converted"],
    "accepted": ["converted"],
    "rejected": [],
    "converted": []
  }'::jsonb;
BEGIN
  IF OLD.status IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  IF NOT (valid_transitions->OLD.status ? NEW.status) THEN
    RAISE EXCEPTION 'Invalid quote status transition: % → %. Valid transitions from % are: %',
      OLD.status, NEW.status, OLD.status, valid_transitions->OLD.status
      USING HINT = 'Contact administrator if you need to override this validation';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add unique constraint on quote_id to prevent duplicate orders
CREATE UNIQUE INDEX IF NOT EXISTS orders_quote_id_unique 
ON orders (quote_id) 
WHERE quote_id IS NOT NULL;

-- Add unique constraint on source_quote_id to prevent duplicate orders
CREATE UNIQUE INDEX IF NOT EXISTS orders_source_quote_id_unique 
ON orders (source_quote_id) 
WHERE source_quote_id IS NOT NULL;