-- Add 'pending_payment' to order_status_enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'pending_payment' 
    AND enumtypid = 'order_status_enum'::regtype
  ) THEN
    ALTER TYPE order_status_enum ADD VALUE 'pending_payment';
  END IF;
END $$;