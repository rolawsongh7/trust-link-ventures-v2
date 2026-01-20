-- Add delivered_by column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_by TEXT;

-- Create or replace the trigger function to log POD uploads and replacements
CREATE OR REPLACE FUNCTION public.log_pod_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Log new POD upload
  IF (OLD.proof_of_delivery_url IS NULL OR OLD.proof_of_delivery_url = '') 
     AND NEW.proof_of_delivery_url IS NOT NULL 
     AND NEW.proof_of_delivery_url != '' THEN
    INSERT INTO public.audit_logs (event_type, resource_type, resource_id, severity, event_data)
    VALUES (
      'proof_of_delivery_uploaded',
      'order',
      NEW.id,
      'info',
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'proof_url', NEW.proof_of_delivery_url,
        'delivered_by', NEW.delivered_by,
        'delivered_at', NEW.delivered_at
      )
    );
  -- Log POD replacement
  ELSIF OLD.proof_of_delivery_url IS NOT NULL 
    AND OLD.proof_of_delivery_url != ''
    AND NEW.proof_of_delivery_url IS NOT NULL 
    AND NEW.proof_of_delivery_url != ''
    AND OLD.proof_of_delivery_url != NEW.proof_of_delivery_url THEN
    INSERT INTO public.audit_logs (event_type, resource_type, resource_id, severity, event_data)
    VALUES (
      'proof_of_delivery_replaced',
      'order',
      NEW.id,
      'warn',
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'old_proof_url', OLD.proof_of_delivery_url,
        'new_proof_url', NEW.proof_of_delivery_url,
        'replaced_by', NEW.delivered_by
      )
    );
  END IF;
  
  -- Log delivery confirmation
  IF (OLD.status != 'delivered' AND NEW.status = 'delivered') THEN
    INSERT INTO public.audit_logs (event_type, resource_type, resource_id, severity, event_data)
    VALUES (
      'delivery_confirmed',
      'order',
      NEW.id,
      'info',
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'delivered_at', NEW.delivered_at,
        'delivered_by', NEW.delivered_by,
        'has_pod', NEW.proof_of_delivery_url IS NOT NULL AND NEW.proof_of_delivery_url != ''
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS log_pod_upload_trigger ON public.orders;
CREATE TRIGGER log_pod_upload_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_pod_upload();

-- Add RLS policy for customers to view their own POD files in order-documents bucket
DO $$
BEGIN
  -- Check if policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Customers can view their own POD files'
  ) THEN
    CREATE POLICY "Customers can view their own POD files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'order-documents' AND
      name LIKE 'proof-of-delivery/%' AND
      EXISTS (
        SELECT 1 FROM public.orders o
        JOIN public.customer_users cu ON cu.customer_id = o.customer_id
        WHERE cu.user_id = auth.uid()
        AND (
          o.proof_of_delivery_url LIKE '%' || storage.objects.name || '%' OR
          o.delivery_proof_url LIKE '%' || storage.objects.name || '%'
        )
      )
    );
  END IF;
END $$;

-- Add delivery_confirmation_pending to the order_status_enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'delivery_confirmation_pending' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status_enum')) THEN
    ALTER TYPE public.order_status_enum ADD VALUE IF NOT EXISTS 'delivery_confirmation_pending' AFTER 'shipped';
  END IF;
END $$;