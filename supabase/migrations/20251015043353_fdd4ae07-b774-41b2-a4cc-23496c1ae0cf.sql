-- Update the is_allowed_admin_email function to include info@trustlinkcompany.com
CREATE OR REPLACE FUNCTION public.is_allowed_admin_email(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  allowed_emails TEXT[] := ARRAY[
    'admin@trustlinkventures.com',
    'manager@trustlinkventures.com',
    'trustlventuresghana_a01@yahoo.com',
    'info@trustlinkcompany.com'
  ];
BEGIN
  RETURN user_email = ANY(allowed_emails);
END;
$function$;