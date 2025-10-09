-- Fix critical security vulnerability in user_roles table
-- Remove overly permissive policies that expose user role information

-- Drop the dangerous public access policies
DROP POLICY IF EXISTS "No direct access to user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "System can manage user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "System can insert user roles" ON public.user_roles;

-- The following policies should remain and are secure:
-- 1. "Admins can view all roles" - restricted to admins only
-- 2. "Admins can insert roles" - restricted to admins only  
-- 3. "Admins can update roles" - restricted to admins only
-- 4. "Admins can delete roles" - restricted to admins only
-- 5. "Users can view their own roles via function" - users can only see their own role

-- Verify the user_roles table structure
-- The table should have:
-- - id (uuid, primary key)
-- - user_id (uuid, references auth.users)
-- - role (user_role enum type)

-- Note: The remaining policies provide proper security:
-- - Admins can manage all roles (using check_user_role function)
-- - Users can only view their own role (user_id = auth.uid())
-- - No public access is allowed