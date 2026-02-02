-- =============================================
-- FIX: Update ALL RLS policies to include super_admin
-- Using is_admin() function which checks for both 'admin' and 'super_admin' roles
-- =============================================

-- =============================================
-- PHASE 1: CRITICAL TABLES (Quote Workflow)
-- =============================================

-- QUOTE_ITEMS TABLE
DROP POLICY IF EXISTS "Admins can insert quote items" ON quote_items;
DROP POLICY IF EXISTS "Admins can update quote items" ON quote_items;
DROP POLICY IF EXISTS "Admins can delete quote items" ON quote_items;
DROP POLICY IF EXISTS "Users can view relevant quote items" ON quote_items;

CREATE POLICY "Admins can insert quote items" 
  ON quote_items FOR INSERT TO authenticated 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update quote items" 
  ON quote_items FOR UPDATE TO authenticated 
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete quote items" 
  ON quote_items FOR DELETE TO authenticated 
  USING (is_admin());

CREATE POLICY "Users can view relevant quote items" 
  ON quote_items FOR SELECT TO authenticated 
  USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_items.quote_id 
      AND (q.customer_email = (auth.jwt() ->> 'email')
        OR q.customer_id IN (SELECT cu.customer_id FROM customer_users cu WHERE cu.user_id = auth.uid()))
    )
  );

-- CUSTOMERS TABLE
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;
DROP POLICY IF EXISTS "Role-based customer viewing" ON customers;
DROP POLICY IF EXISTS "Users can update assigned customers" ON customers;

CREATE POLICY "Admins can delete customers" 
  ON customers FOR DELETE TO authenticated 
  USING (is_admin());

CREATE POLICY "Role-based customer viewing" 
  ON customers FOR SELECT TO authenticated 
  USING (
    is_admin() 
    OR id IN (SELECT customer_id FROM customer_users WHERE user_id = auth.uid())
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Users can update assigned customers" 
  ON customers FOR UPDATE TO authenticated 
  USING (is_admin() OR assigned_to = auth.uid())
  WITH CHECK (is_admin() OR assigned_to = auth.uid());

-- ORDERS TABLE
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Orders can be created by authorized users or system" ON orders;
DROP POLICY IF EXISTS "Customers and admins can update orders" ON orders;

CREATE POLICY "Admins can delete orders" 
  ON orders FOR DELETE TO authenticated 
  USING (is_admin());

CREATE POLICY "Admins can update all orders" 
  ON orders FOR UPDATE TO authenticated 
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can view all orders" 
  ON orders FOR SELECT TO authenticated 
  USING (is_admin());

CREATE POLICY "Orders can be created by authorized users or system" 
  ON orders FOR INSERT TO authenticated 
  WITH CHECK (
    is_admin() 
    OR customer_id IN (SELECT customer_id FROM customer_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Customers and admins can update orders" 
  ON orders FOR UPDATE TO authenticated 
  USING (
    is_admin() 
    OR customer_id IN (SELECT customer_id FROM customer_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    is_admin() 
    OR customer_id IN (SELECT customer_id FROM customer_users WHERE user_id = auth.uid())
  );

-- =============================================
-- PHASE 2: IMPORTANT ADMIN TABLES
-- =============================================

-- CUSTOMER_ADDRESSES TABLE
DROP POLICY IF EXISTS "Admins can manage all addresses" ON customer_addresses;
DROP POLICY IF EXISTS "Admins can view all addresses" ON customer_addresses;

CREATE POLICY "Admins can manage all addresses" 
  ON customer_addresses FOR ALL TO authenticated 
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can view all addresses" 
  ON customer_addresses FOR SELECT TO authenticated 
  USING (is_admin());

-- CUSTOMER_USERS TABLE
DROP POLICY IF EXISTS "Admins can manage customer users" ON customer_users;

CREATE POLICY "Admins can manage customer users" 
  ON customer_users FOR ALL TO authenticated 
  USING (is_admin()) WITH CHECK (is_admin());

-- INVOICE_ITEMS TABLE
DROP POLICY IF EXISTS "Admins can manage invoice items" ON invoice_items;

CREATE POLICY "Admins can manage invoice items" 
  ON invoice_items FOR ALL TO authenticated 
  USING (is_admin()) WITH CHECK (is_admin());

-- OPPORTUNITIES TABLE
DROP POLICY IF EXISTS "Admins can delete opportunities" ON opportunities;
DROP POLICY IF EXISTS "Admins can update opportunities" ON opportunities;
DROP POLICY IF EXISTS "Admins can view opportunities" ON opportunities;

CREATE POLICY "Admins can delete opportunities" 
  ON opportunities FOR DELETE TO authenticated 
  USING (is_admin());

CREATE POLICY "Admins can update opportunities" 
  ON opportunities FOR UPDATE TO authenticated 
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can view opportunities" 
  ON opportunities FOR SELECT TO authenticated 
  USING (is_admin());

-- ACTIVITIES TABLE
DROP POLICY IF EXISTS "Admins can delete activities" ON activities;

CREATE POLICY "Admins can delete activities" 
  ON activities FOR DELETE TO authenticated 
  USING (is_admin());

-- COMMUNICATIONS TABLE
DROP POLICY IF EXISTS "Admins can delete communications" ON communications;

CREATE POLICY "Admins can delete communications" 
  ON communications FOR DELETE TO authenticated 
  USING (is_admin());

-- SUPPLIER_PRODUCTS TABLE
DROP POLICY IF EXISTS "Admins can manage supplier products" ON supplier_products;
DROP POLICY IF EXISTS "Admins can delete supplier products" ON supplier_products;
DROP POLICY IF EXISTS "Admins can insert supplier products" ON supplier_products;

CREATE POLICY "Admins can manage supplier products" 
  ON supplier_products FOR ALL TO authenticated 
  USING (is_admin()) WITH CHECK (is_admin());

-- USER_ROLES TABLE
DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;

CREATE POLICY "Admins can insert user roles" 
  ON user_roles FOR INSERT TO authenticated 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update user roles" 
  ON user_roles FOR UPDATE TO authenticated 
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete user roles" 
  ON user_roles FOR DELETE TO authenticated 
  USING (is_admin());

CREATE POLICY "Admins can view all user roles" 
  ON user_roles FOR SELECT TO authenticated 
  USING (is_admin());

-- =============================================
-- PHASE 3: SECURITY & AUDIT TABLES
-- =============================================

-- ACCOUNT_DELETIONS TABLE
DROP POLICY IF EXISTS "Admins can view account deletions" ON account_deletions;

CREATE POLICY "Admins can view account deletions" 
  ON account_deletions FOR SELECT TO authenticated 
  USING (is_admin());

-- AUDIT_LOGS TABLE
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;

CREATE POLICY "Admins can view audit logs" 
  ON audit_logs FOR SELECT TO authenticated 
  USING (is_admin());

-- CSP_VIOLATIONS TABLE
DROP POLICY IF EXISTS "Admins can view csp violations" ON csp_violations;

CREATE POLICY "Admins can view csp violations" 
  ON csp_violations FOR SELECT TO authenticated 
  USING (is_admin());

-- FAILED_LOGIN_ATTEMPTS TABLE
DROP POLICY IF EXISTS "Admins can view failed login attempts" ON failed_login_attempts;

CREATE POLICY "Admins can view failed login attempts" 
  ON failed_login_attempts FOR SELECT TO authenticated 
  USING (is_admin());

-- FILE_UPLOADS TABLE
DROP POLICY IF EXISTS "Admins can view all file uploads" ON file_uploads;

CREATE POLICY "Admins can view all file uploads" 
  ON file_uploads FOR SELECT TO authenticated 
  USING (is_admin());

-- ORDER_STATUS_HISTORY TABLE
DROP POLICY IF EXISTS "Admins can view order status history" ON order_status_history;

CREATE POLICY "Admins can view order status history" 
  ON order_status_history FOR SELECT TO authenticated 
  USING (is_admin());

-- QUOTE_STATUS_HISTORY TABLE
DROP POLICY IF EXISTS "Admins can view quote status history" ON quote_status_history;

CREATE POLICY "Admins can view quote status history" 
  ON quote_status_history FOR SELECT TO authenticated 
  USING (is_admin());

-- QUOTE_VIEW_ANALYTICS TABLE
DROP POLICY IF EXISTS "Admins can view quote analytics" ON quote_view_analytics;

CREATE POLICY "Admins can view quote analytics" 
  ON quote_view_analytics FOR SELECT TO authenticated 
  USING (is_admin());

-- SECURITY_ALERT_RULES TABLE
DROP POLICY IF EXISTS "Admins can manage security alert rules" ON security_alert_rules;

CREATE POLICY "Admins can manage security alert rules" 
  ON security_alert_rules FOR ALL TO authenticated 
  USING (is_admin()) WITH CHECK (is_admin());

-- SECURITY_ALERTS TABLE
DROP POLICY IF EXISTS "Admins can update security alerts" ON security_alerts;
DROP POLICY IF EXISTS "Admins can view security alerts" ON security_alerts;

CREATE POLICY "Admins can update security alerts" 
  ON security_alerts FOR UPDATE TO authenticated 
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can view security alerts" 
  ON security_alerts FOR SELECT TO authenticated 
  USING (is_admin());

-- SYSTEM_EVENTS TABLE
DROP POLICY IF EXISTS "Admins can view system events" ON system_events;

CREATE POLICY "Admins can view system events" 
  ON system_events FOR SELECT TO authenticated 
  USING (is_admin());

-- =============================================
-- PHASE 4: CONFIGURATION & OTHER TABLES
-- =============================================

-- PASSWORD_POLICIES TABLE
DROP POLICY IF EXISTS "Admins can manage password policies" ON password_policies;

CREATE POLICY "Admins can manage password policies" 
  ON password_policies FOR ALL TO authenticated 
  USING (is_admin()) WITH CHECK (is_admin());

-- PIPELINE_STAGES TABLE
DROP POLICY IF EXISTS "Admins can manage pipeline stages" ON pipeline_stages;

CREATE POLICY "Admins can manage pipeline stages" 
  ON pipeline_stages FOR ALL TO authenticated 
  USING (is_admin()) WITH CHECK (is_admin());

-- PRODUCTS TABLE
DROP POLICY IF EXISTS "Admins can delete products" ON products;

CREATE POLICY "Admins can delete products" 
  ON products FOR DELETE TO authenticated 
  USING (is_admin());

-- DELIVERY_TRACKING_TOKENS TABLE
DROP POLICY IF EXISTS "Admins can manage delivery tracking tokens" ON delivery_tracking_tokens;

CREATE POLICY "Admins can manage delivery tracking tokens" 
  ON delivery_tracking_tokens FOR ALL TO authenticated 
  USING (is_admin()) WITH CHECK (is_admin());

-- NEWSLETTER_SUBSCRIPTIONS TABLE
DROP POLICY IF EXISTS "Admins can manage newsletter subscriptions" ON newsletter_subscriptions;
DROP POLICY IF EXISTS "Admins can view newsletter subscriptions" ON newsletter_subscriptions;

CREATE POLICY "Admins can manage newsletter subscriptions" 
  ON newsletter_subscriptions FOR ALL TO authenticated 
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can view newsletter subscriptions" 
  ON newsletter_subscriptions FOR SELECT TO authenticated 
  USING (is_admin());