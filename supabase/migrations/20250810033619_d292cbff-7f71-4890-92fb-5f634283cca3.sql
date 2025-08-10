-- Insert admin role for the temporary admin UUID
INSERT INTO public.user_roles (user_id, role) 
VALUES ('00000000-0000-0000-0000-000000000001', 'admin'::user_role)
ON CONFLICT (user_id, role) DO NOTHING;