-- Security Hardening: Fix search_path on critical functions
-- Note: Most "USING (true)" policies are for system/logging tables which is acceptable

-- Set explicit search_path on check_user_role function (critical for security)
CREATE OR REPLACE FUNCTION public.check_user_role(check_user_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = check_user_id 
    AND role = required_role
  );
$$;

-- Create admin-only update policy helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Add storage bucket for proof of delivery if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-documents',
  'order-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for order documents (POD)
DROP POLICY IF EXISTS "Admins can upload order documents" ON storage.objects;
CREATE POLICY "Admins can upload order documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-documents' 
  AND public.is_admin()
);

DROP POLICY IF EXISTS "Admins can view order documents" ON storage.objects;
CREATE POLICY "Admins can view order documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-documents' 
  AND public.is_admin()
);

DROP POLICY IF EXISTS "Admins can update order documents" ON storage.objects;
CREATE POLICY "Admins can update order documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'order-documents' 
  AND public.is_admin()
);

-- Add audit log for payment verification
CREATE OR REPLACE FUNCTION public.log_payment_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.payment_verified_at IS NULL AND NEW.payment_verified_at IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id,
      event_type,
      action,
      resource_type,
      resource_id,
      event_data,
      severity
    ) VALUES (
      NEW.payment_verified_by,
      'payment_verified',
      'update',
      'orders',
      NEW.id::text,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'payment_reference', NEW.payment_reference,
        'payment_method', NEW.payment_method,
        'amount', NEW.total_amount
      ),
      'medium'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_payment_verification_trigger ON public.orders;
CREATE TRIGGER log_payment_verification_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.payment_verified_at IS NULL AND NEW.payment_verified_at IS NOT NULL)
  EXECUTE FUNCTION public.log_payment_verification();

-- Add audit log for POD upload
CREATE OR REPLACE FUNCTION public.log_pod_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.proof_of_delivery_url IS NULL AND NEW.proof_of_delivery_url IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id,
      event_type,
      action,
      resource_type,
      resource_id,
      event_data,
      severity
    ) VALUES (
      auth.uid(),
      'proof_of_delivery_uploaded',
      'update',
      'orders',
      NEW.id::text,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'delivered_at', NEW.delivered_at
      ),
      'low'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_pod_upload_trigger ON public.orders;
CREATE TRIGGER log_pod_upload_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.proof_of_delivery_url IS NULL AND NEW.proof_of_delivery_url IS NOT NULL)
  EXECUTE FUNCTION public.log_pod_upload();