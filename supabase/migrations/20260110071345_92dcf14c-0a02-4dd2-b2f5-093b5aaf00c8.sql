-- Add admin_notification_preferences column to store granular admin notification settings
-- This stores a JSON object with notification type keys and {in_app: boolean, email: boolean} values

ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS admin_notification_settings jsonb DEFAULT '{
  "new_quote_request": {"in_app": true, "email": true},
  "quote_accepted": {"in_app": true, "email": true},
  "new_order": {"in_app": true, "email": true},
  "payment_proof_uploaded": {"in_app": true, "email": true},
  "address_confirmed": {"in_app": true, "email": true}
}'::jsonb;