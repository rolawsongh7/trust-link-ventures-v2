-- Phase 1: Smart Quote-Customer Auto-Linking
CREATE OR REPLACE FUNCTION auto_link_quote_to_customer()
RETURNS TRIGGER AS $$
DECLARE
  matched_customer_id UUID;
BEGIN
  -- Only process if customer_id is not already set and we have a customer_email
  IF NEW.customer_id IS NULL AND NEW.customer_email IS NOT NULL THEN
    -- Try to find existing customer by email
    SELECT id INTO matched_customer_id
    FROM customers
    WHERE LOWER(email) = LOWER(NEW.customer_email)
    LIMIT 1;
    
    IF matched_customer_id IS NOT NULL THEN
      NEW.customer_id := matched_customer_id;
      
      -- Log the auto-linking
      PERFORM log_security_event(
        'quote_auto_linked_to_customer',
        auth.uid(),
        jsonb_build_object(
          'quote_id', NEW.id,
          'quote_number', NEW.quote_number,
          'customer_id', matched_customer_id,
          'customer_email', NEW.customer_email,
          'auto_linked', true
        ),
        NULL,
        NULL,
        'low'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_link_quote_to_customer_trigger ON quotes;
CREATE TRIGGER auto_link_quote_to_customer_trigger
  BEFORE INSERT OR UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_quote_to_customer();

-- Phase 2: Enhanced Audit Trail for Data Integrity
CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields jsonb := '{}'::jsonb;
  field_name text;
  severity_level text := 'low';
BEGIN
  -- Determine severity based on operation
  IF TG_OP = 'DELETE' THEN
    severity_level := 'high';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check for critical field changes
    IF TG_TABLE_NAME = 'orders' THEN
      IF OLD.total_amount != NEW.total_amount OR OLD.status != NEW.status THEN
        severity_level := 'medium';
      END IF;
    ELSIF TG_TABLE_NAME = 'quotes' THEN
      IF OLD.status != NEW.status THEN
        severity_level := 'medium';
      END IF;
    END IF;
  END IF;

  -- Build changed fields for UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- Dynamically compare all fields
    FOR field_name IN 
      SELECT column_name::text 
      FROM information_schema.columns 
      WHERE table_schema = TG_TABLE_SCHEMA 
        AND table_name = TG_TABLE_NAME
        AND column_name NOT IN ('updated_at', 'created_at')
    LOOP
      EXECUTE format('
        SELECT CASE 
          WHEN ($1).%I IS DISTINCT FROM ($2).%I 
          THEN jsonb_build_object(
            ''old'', to_jsonb(($1).%I), 
            ''new'', to_jsonb(($2).%I)
          )
          ELSE NULL
        END', 
        field_name, field_name, field_name, field_name
      ) INTO changed_fields USING OLD, NEW;
      
      IF changed_fields IS NOT NULL THEN
        EXIT; -- Found changes, no need to continue
      END IF;
    END LOOP;
  END IF;

  -- Log to audit_logs
  INSERT INTO audit_logs (
    user_id,
    event_type,
    action,
    resource_type,
    resource_id,
    event_data,
    changes,
    severity,
    created_at
  ) VALUES (
    auth.uid(),
    'data_change',
    TG_OP,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::text
      ELSE NEW.id::text
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW)
      ELSE jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      )
    END,
    changed_fields,
    severity_level,
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for critical tables
DROP TRIGGER IF EXISTS audit_orders_changes ON orders;
CREATE TRIGGER audit_orders_changes
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_table_changes();

DROP TRIGGER IF EXISTS audit_quotes_changes ON quotes;
CREATE TRIGGER audit_quotes_changes
  AFTER INSERT OR UPDATE OR DELETE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION log_table_changes();

DROP TRIGGER IF EXISTS audit_customers_changes ON customers;
CREATE TRIGGER audit_customers_changes
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION log_table_changes();