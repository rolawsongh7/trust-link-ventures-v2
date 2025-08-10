-- Create session validation function
CREATE OR REPLACE FUNCTION public.validate_session(p_session_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_valid boolean := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM user_sessions 
    WHERE session_id = p_session_token 
    AND is_active = true 
    AND expires_at > now()
  ) INTO session_valid;
  
  -- Update last activity if session is valid
  IF session_valid THEN
    UPDATE user_sessions 
    SET updated_at = now() 
    WHERE session_id = p_session_token;
  END IF;
  
  RETURN session_valid;
END;
$$;

-- Create file upload validation function
CREATE OR REPLACE FUNCTION public.validate_file_upload(
  p_filename text,
  p_mime_type text,
  p_file_size bigint,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  validation_result jsonb := '{"valid": true, "errors": []}'::jsonb;
  errors text[] := '{}';
  max_file_size bigint := 50 * 1024 * 1024; -- 50MB
  allowed_types text[] := ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/csv', 'application/vnd.ms-excel'];
BEGIN
  -- Check file size
  IF p_file_size > max_file_size THEN
    errors := array_append(errors, 'File size exceeds maximum limit of 50MB');
  END IF;
  
  -- Check file type
  IF NOT (p_mime_type = ANY(allowed_types)) THEN
    errors := array_append(errors, 'File type not allowed');
  END IF;
  
  -- Check filename for malicious patterns
  IF p_filename ~* '\.(exe|bat|cmd|scr|pif|vbs|js)$' THEN
    errors := array_append(errors, 'Potentially dangerous file extension');
  END IF;
  
  -- Build result
  IF array_length(errors, 1) > 0 THEN
    validation_result := jsonb_build_object(
      'valid', false,
      'errors', to_jsonb(errors)
    );
  END IF;
  
  RETURN validation_result;
END;
$$;

-- Create security event logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_user_id uuid DEFAULT NULL,
  p_event_data jsonb DEFAULT '{}',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_severity text DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    event_type,
    event_data,
    ip_address,
    user_agent,
    severity,
    created_at
  ) VALUES (
    p_user_id,
    p_event_type,
    p_event_data,
    p_ip_address,
    p_user_agent,
    p_severity,
    now()
  );
END;
$$;

-- Create enhanced audit logging function
CREATE OR REPLACE FUNCTION public.enhanced_audit_log(
  p_action text,
  p_table_name text DEFAULT NULL,
  p_record_id text DEFAULT NULL,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_risk_level text DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_data jsonb;
BEGIN
  -- Build comprehensive event data
  event_data := jsonb_build_object(
    'action', p_action,
    'table_name', p_table_name,
    'record_id', p_record_id,
    'old_data', p_old_data,
    'new_data', p_new_data,
    'timestamp', extract(epoch from now()),
    'risk_level', p_risk_level
  );
  
  INSERT INTO audit_logs (
    user_id,
    event_type,
    event_data,
    ip_address,
    user_agent,
    severity,
    created_at
  ) VALUES (
    auth.uid(),
    'data_change',
    event_data,
    p_ip_address,
    p_user_agent,
    CASE p_risk_level
      WHEN 'high' THEN 'high'
      WHEN 'medium' THEN 'medium'
      ELSE 'low'
    END,
    now()
  );
END;
$$;

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  UPDATE user_sessions 
  SET is_active = false 
  WHERE expires_at < now() 
  AND is_active = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Create function to get password policy
CREATE OR REPLACE FUNCTION public.get_password_policy()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  policy_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'min_length', min_length,
    'require_uppercase', require_uppercase,
    'require_lowercase', require_lowercase,
    'require_numbers', require_numbers,
    'require_special_chars', require_special_chars,
    'max_age_days', max_age_days,
    'prevent_reuse_count', prevent_reuse_count
  )
  INTO policy_data
  FROM password_policies
  WHERE id = 1;
  
  RETURN COALESCE(policy_data, '{
    "min_length": 8,
    "require_uppercase": true,
    "require_lowercase": true,
    "require_numbers": true,
    "require_special_chars": true,
    "max_age_days": 90,
    "prevent_reuse_count": 5
  }'::jsonb);
END;
$$;

-- Create trigger function for automatic security event logging
CREATE OR REPLACE FUNCTION public.log_login_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log successful login
  IF NEW.success = true THEN
    PERFORM public.log_security_event(
      'successful_login',
      NEW.user_id,
      jsonb_build_object(
        'ip_address', NEW.ip_address::text,
        'user_agent', NEW.user_agent,
        'risk_score', NEW.risk_score
      ),
      NEW.ip_address,
      NEW.user_agent,
      CASE 
        WHEN NEW.risk_score > 70 THEN 'high'
        WHEN NEW.risk_score > 40 THEN 'medium'
        ELSE 'low'
      END
    );
  ELSE
    -- Log failed login
    PERFORM public.log_security_event(
      'failed_login',
      NEW.user_id,
      jsonb_build_object(
        'ip_address', NEW.ip_address::text,
        'user_agent', NEW.user_agent,
        'risk_score', NEW.risk_score
      ),
      NEW.ip_address,
      NEW.user_agent,
      'medium'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for login attempt logging
DROP TRIGGER IF EXISTS trigger_log_login_attempt ON user_login_history;
CREATE TRIGGER trigger_log_login_attempt
  AFTER INSERT ON user_login_history
  FOR EACH ROW
  EXECUTE FUNCTION public.log_login_attempt();