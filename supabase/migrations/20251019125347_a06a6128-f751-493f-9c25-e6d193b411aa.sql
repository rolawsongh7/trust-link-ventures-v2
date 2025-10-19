-- Update is_allowed_admin_email function to support domain-based matching
CREATE OR REPLACE FUNCTION public.is_allowed_admin_email(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- Specific allowed emails
  allowed_emails TEXT[] := ARRAY[
    'admin@trustlinkventures.com',
    'manager@trustlinkventures.com',
    'trustlventuresghana_a01@yahoo.com',
    'info@trustlinkcompany.com'
  ];
  
  -- Allowed domains
  allowed_domains TEXT[] := ARRAY[
    '@trustlinkcompany.com'
  ];
  
  domain TEXT;
BEGIN
  -- Check if email matches any specific allowed email
  IF user_email = ANY(allowed_emails) THEN
    RETURN true;
  END IF;
  
  -- Check if email matches any allowed domain
  FOREACH domain IN ARRAY allowed_domains
  LOOP
    IF user_email LIKE '%' || domain THEN
      RETURN true;
    END IF;
  END LOOP;
  
  RETURN false;
END;
$function$;