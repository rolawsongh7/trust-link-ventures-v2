-- First, let's update the check constraint to include 'info' and 'warning' 
-- which are commonly used severity levels

-- Drop the old constraint
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_severity_check;

-- Add the new constraint with all valid severity levels
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_severity_check 
CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text, 'info'::text, 'warning'::text]));