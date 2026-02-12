
DO $$
DECLARE
  _tenant_id uuid;
BEGIN
  INSERT INTO public.tenants (name, slug, status)
  VALUES ('TrustLink Demo', 'trustlink-demo', 'active')
  RETURNING id INTO _tenant_id;

  INSERT INTO public.tenant_users (tenant_id, user_id, role)
  VALUES (_tenant_id, '7fca904d-7b99-45ae-8f40-b710dc149cf2', 'owner');
END $$;
