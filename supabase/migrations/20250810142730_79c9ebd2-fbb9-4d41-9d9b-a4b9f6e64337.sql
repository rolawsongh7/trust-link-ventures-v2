-- Fix OTP expiry issue by updating auth configuration
-- This sets a more secure OTP expiry time (10 minutes instead of default)
UPDATE auth.config 
SET 
  site_url = 'https://ppyfrftmexvgnsxlhdbz.supabase.co',
  email_confirm_max_age = 600, -- 10 minutes instead of 24 hours
  recovery_token_max_age = 600, -- 10 minutes for password reset
  magic_link_max_age = 600 -- 10 minutes for magic links
WHERE TRUE;