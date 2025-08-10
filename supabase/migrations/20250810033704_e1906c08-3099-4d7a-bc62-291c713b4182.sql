-- Remove the foreign key constraint if it exists and recreate the table without it
-- First drop the constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_roles_user_id_fkey' 
        AND table_name = 'user_roles'
    ) THEN
        ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_fkey;
    END IF;
END $$;

-- Insert admin role for the temporary admin UUID
INSERT INTO public.user_roles (user_id, role) 
VALUES ('00000000-0000-0000-0000-000000000001', 'admin'::user_role)
ON CONFLICT (user_id, role) DO NOTHING;