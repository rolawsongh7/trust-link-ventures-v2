-- Create user_invitations tracking table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('quote_request', 'lead', 'customer', 'manual')),
  source_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- Create index for faster lookups
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX idx_user_invitations_source ON public.user_invitations(source_type, source_id);

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all invitations
CREATE POLICY "Admins can view all invitations"
ON public.user_invitations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Admins can create invitations
CREATE POLICY "Admins can create invitations"
ON public.user_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Admins can update invitations
CREATE POLICY "Admins can update invitations"
ON public.user_invitations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Function to check if user already exists or has pending invitation
CREATE OR REPLACE FUNCTION public.check_user_invitation_status(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
  v_user_exists BOOLEAN;
  v_pending_invitation BOOLEAN;
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = p_email
  ) INTO v_user_exists;
  
  -- Check if there's a pending invitation
  SELECT EXISTS (
    SELECT 1 FROM public.user_invitations 
    WHERE email = p_email 
    AND status = 'pending'
    AND expires_at > now()
  ) INTO v_pending_invitation;
  
  v_result := jsonb_build_object(
    'user_exists', v_user_exists,
    'pending_invitation', v_pending_invitation,
    'can_invite', NOT v_user_exists AND NOT v_pending_invitation
  );
  
  RETURN v_result;
END;
$function$;