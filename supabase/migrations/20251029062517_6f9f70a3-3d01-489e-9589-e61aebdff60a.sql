-- Phase 3: Migrate existing invoice URLs from signed URLs to clean file paths

-- Step 1: Extract clean file paths from signed URLs
UPDATE invoices
SET file_url = regexp_replace(
  file_url, 
  '.*/storage/v1/object/sign/invoices/([^?]+).*', 
  '\1'
)
WHERE file_url LIKE '%?token=%'
AND file_url IS NOT NULL;

-- Log the migration for audit trail
INSERT INTO audit_logs (
  user_id,
  event_type,
  action,
  event_data,
  severity
)
SELECT 
  NULL,
  'invoice_url_migration',
  'data_cleanup',
  jsonb_build_object(
    'migration_type', 'signed_url_to_path',
    'affected_count', COUNT(*),
    'timestamp', extract(epoch from now())
  ),
  'low'
FROM invoices
WHERE file_url IS NOT NULL;