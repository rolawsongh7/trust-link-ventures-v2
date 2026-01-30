-- Phase 1: System settings table for maintenance mode
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can read/write system settings
CREATE POLICY "Super admins can manage system settings"
ON public.system_settings
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Insert initial maintenance mode setting
INSERT INTO public.system_settings (key, value)
VALUES ('maintenance_mode', '{"enabled": false, "message": null, "started_at": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Phase 2: RPC to toggle maintenance mode (Super Admin only)
CREATE OR REPLACE FUNCTION public.toggle_maintenance_mode(
  p_enabled boolean,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_result jsonb;
BEGIN
  -- Guard: Super admin only
  IF NOT is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Super admin privileges required';
  END IF;

  -- Update the setting
  UPDATE public.system_settings
  SET 
    value = jsonb_build_object(
      'enabled', p_enabled,
      'message', p_message,
      'started_at', CASE WHEN p_enabled THEN now() ELSE NULL END
    ),
    updated_by = v_caller_id,
    updated_at = now()
  WHERE key = 'maintenance_mode'
  RETURNING value INTO v_result;

  -- Log the action
  PERFORM log_security_event(
    'maintenance_mode_toggled',
    v_caller_id,
    jsonb_build_object(
      'enabled', p_enabled,
      'message', p_message
    ),
    NULL, NULL, 'high'
  );

  RETURN jsonb_build_object(
    'success', true,
    'maintenance_mode', v_result
  );
END;
$$;

-- Phase 2: RPC to get maintenance mode status (public read for banner)
CREATE OR REPLACE FUNCTION public.get_maintenance_mode()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT value INTO v_result
  FROM public.system_settings
  WHERE key = 'maintenance_mode';

  RETURN COALESCE(v_result, '{"enabled": false}'::jsonb);
END;
$$;

-- Phase 3: RPC to detect orphaned data (read-only, Super Admin only)
CREATE OR REPLACE FUNCTION public.detect_orphaned_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_orphaned_quotes integer;
  v_orphaned_orders integer;
  v_orphaned_invoices integer;
  v_orphaned_files integer;
  v_quotes_without_requests integer;
BEGIN
  -- Guard: Super admin only
  IF NOT is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Super admin privileges required';
  END IF;

  -- Count quotes without linked quote requests
  SELECT COUNT(*) INTO v_quotes_without_requests
  FROM quotes q
  WHERE q.quote_request_id IS NULL;

  -- Count orders without customers
  SELECT COUNT(*) INTO v_orphaned_orders
  FROM orders o
  WHERE o.customer_id IS NULL;

  -- Count invoices without valid orders or customers
  SELECT COUNT(*) INTO v_orphaned_invoices
  FROM invoices i
  WHERE i.customer_id IS NULL AND i.order_id IS NULL;

  -- Count file uploads without valid user reference (check if user still exists)
  SELECT COUNT(*) INTO v_orphaned_files
  FROM file_uploads f
  LEFT JOIN auth.users u ON f.user_id = u.id
  WHERE u.id IS NULL;

  -- Log the detection run
  PERFORM log_security_event(
    'orphaned_data_detection',
    v_caller_id,
    jsonb_build_object(
      'quotes_without_requests', v_quotes_without_requests,
      'orders_without_customers', v_orphaned_orders,
      'invoices_orphaned', v_orphaned_invoices,
      'files_orphaned', v_orphaned_files
    ),
    NULL, NULL, 'low'
  );

  RETURN jsonb_build_object(
    'success', true,
    'detected_at', now(),
    'orphaned_data', jsonb_build_object(
      'quotes_without_requests', v_quotes_without_requests,
      'orders_without_customers', v_orphaned_orders,
      'invoices_orphaned', v_orphaned_invoices,
      'files_orphaned', v_orphaned_files,
      'total', v_quotes_without_requests + v_orphaned_orders + v_orphaned_invoices + v_orphaned_files
    )
  );
END;
$$;

-- Phase 2: RPC for bulk PDF regeneration (Super Admin only, wraps existing logic)
CREATE OR REPLACE FUNCTION public.regenerate_invoice_pdfs(
  p_invoice_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_invoice_count integer;
  v_invoice_ids uuid[];
BEGIN
  -- Guard: Super admin only
  IF NOT is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Super admin privileges required';
  END IF;

  -- Build list of invoices to regenerate
  IF p_invoice_ids IS NOT NULL AND array_length(p_invoice_ids, 1) > 0 THEN
    v_invoice_ids := p_invoice_ids;
  ELSIF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    SELECT array_agg(id) INTO v_invoice_ids
    FROM invoices
    WHERE issue_date >= p_start_date 
      AND issue_date <= p_end_date;
  ELSE
    RAISE EXCEPTION 'Must provide either invoice_ids or date range';
  END IF;

  v_invoice_count := COALESCE(array_length(v_invoice_ids, 1), 0);

  -- Log the action
  PERFORM log_security_event(
    'bulk_pdf_regeneration_initiated',
    v_caller_id,
    jsonb_build_object(
      'invoice_count', v_invoice_count,
      'invoice_ids', v_invoice_ids,
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    NULL, NULL, 'high'
  );

  -- Return the list for frontend to process
  RETURN jsonb_build_object(
    'success', true,
    'invoice_count', v_invoice_count,
    'invoice_ids', v_invoice_ids,
    'initiated_at', now()
  );
END;
$$;

-- Phase 1: RPC to get diagnostics history (Super Admin gets full, Admin gets limited)
CREATE OR REPLACE FUNCTION public.get_diagnostics_history(
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_super_admin boolean;
  v_results jsonb;
BEGIN
  v_is_super_admin := is_super_admin(v_caller_id);

  -- Super admin gets full history, admin gets recent
  SELECT jsonb_agg(row_to_json(logs)) INTO v_results
  FROM (
    SELECT 
      id, event_type, action, severity, 
      event_data, created_at, user_id
    FROM audit_logs
    WHERE event_type IN ('diagnostics_run', 'system_check', 'health_check')
    ORDER BY created_at DESC
    LIMIT CASE WHEN v_is_super_admin THEN p_limit ELSE LEAST(p_limit, 5) END
  ) logs;

  RETURN jsonb_build_object(
    'success', true,
    'is_super_admin', v_is_super_admin,
    'history', COALESCE(v_results, '[]'::jsonb)
  );
END;
$$;

-- Phase 1: RPC to get extended audit logs with filters (Super Admin only for full access)
CREATE OR REPLACE FUNCTION public.get_extended_audit_logs(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_severity text DEFAULT NULL,
  p_event_type text DEFAULT NULL,
  p_user_role text DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_super_admin boolean;
  v_results jsonb;
  v_total_count integer;
BEGIN
  v_is_super_admin := is_super_admin(v_caller_id);

  -- Build dynamic query based on access level
  WITH filtered_logs AS (
    SELECT 
      al.id, al.event_type, al.action, al.severity,
      al.event_data, al.created_at, al.user_id,
      al.resource_type, al.resource_id, al.ip_address,
      ur.role as user_role
    FROM audit_logs al
    LEFT JOIN user_roles ur ON al.user_id = ur.user_id
    WHERE 
      -- Severity filter
      (p_severity IS NULL OR al.severity = p_severity)
      -- Event type filter
      AND (p_event_type IS NULL OR al.event_type = p_event_type)
      -- Role filter (super admin only)
      AND (p_user_role IS NULL OR NOT v_is_super_admin OR ur.role::text = p_user_role)
      -- Date filters
      AND (p_start_date IS NULL OR al.created_at >= p_start_date)
      AND (p_end_date IS NULL OR al.created_at <= p_end_date)
      -- Non-super-admin only sees last 30 days
      AND (v_is_super_admin OR al.created_at >= (now() - interval '30 days'))
    ORDER BY al.created_at DESC
  )
  SELECT 
    jsonb_agg(row_to_json(filtered_logs)),
    COUNT(*) OVER()
  INTO v_results, v_total_count
  FROM filtered_logs
  LIMIT p_limit
  OFFSET p_offset;

  RETURN jsonb_build_object(
    'success', true,
    'is_super_admin', v_is_super_admin,
    'logs', COALESCE(v_results, '[]'::jsonb),
    'total_count', COALESCE(v_total_count, 0),
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;