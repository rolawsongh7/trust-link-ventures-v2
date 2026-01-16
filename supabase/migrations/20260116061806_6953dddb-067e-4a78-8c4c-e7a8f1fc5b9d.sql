-- Fix function search path for set_revision_number
CREATE OR REPLACE FUNCTION public.set_revision_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.revision_number := (
    SELECT COALESCE(MAX(revision_number), 0) + 1
    FROM public.quote_revisions
    WHERE quote_id = NEW.quote_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;