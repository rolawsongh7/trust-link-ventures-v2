-- Final batch: Fix remaining functions with search_path issues

-- 12. validate_quote_status_transition
CREATE OR REPLACE FUNCTION public.validate_quote_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  valid_transitions jsonb := '{
    "draft": ["sent"],
    "sent": ["accepted", "rejected"],
    "accepted": [],
    "rejected": []
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

-- 13. log_order_status_change
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF OLD.status IS NULL OR OLD.status != NEW.status THEN
    INSERT INTO order_status_history (
      order_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 14. log_quote_status_change
CREATE OR REPLACE FUNCTION public.log_quote_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF OLD.status IS NULL OR OLD.status != NEW.status THEN
    INSERT INTO quote_status_history (
      quote_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 15. handle_new_user (fix empty search_path)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$function$;

-- Add comments explaining the security improvement
COMMENT ON FUNCTION public.validate_quote_status_transition IS 
'Fixed search_path to prevent privilege escalation attacks';

COMMENT ON FUNCTION public.log_order_status_change IS 
'Fixed search_path to prevent privilege escalation attacks';

COMMENT ON FUNCTION public.log_quote_status_change IS 
'Fixed search_path to prevent privilege escalation attacks';

COMMENT ON FUNCTION public.handle_new_user IS 
'Fixed search_path from empty string to public schema to prevent privilege escalation attacks';