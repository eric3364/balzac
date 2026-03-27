-- 1. footer_settings: Create safe RPC for public display, restrict direct SELECT to admins
CREATE OR REPLACE FUNCTION public.get_public_footer_settings()
RETURNS TABLE(
  copyright_text text,
  company_address text,
  company_email text,
  company_phone text,
  cookie_management_url text,
  legal_link_enabled boolean,
  legal_link_label text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    fs.copyright_text,
    fs.company_address,
    fs.company_email,
    fs.company_phone,
    fs.cookie_management_url,
    fs.legal_link_enabled,
    fs.legal_link_label
  FROM public.footer_settings fs
  LIMIT 1;
$$;

-- Drop the overly permissive public SELECT
DROP POLICY IF EXISTS "Public can view footer settings" ON public.footer_settings;

-- Add admin-only SELECT (super admins already have ALL via existing policy)
CREATE POLICY "Admins can view footer settings"
  ON public.footer_settings
  FOR SELECT
  TO authenticated
  USING (is_any_admin());

-- 2. questions: Restrict direct SELECT (with answers) to super admins only
DROP POLICY IF EXISTS "Only admins can directly query questions" ON public.questions;

CREATE POLICY "Only super admins can directly query questions"
  ON public.questions
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- 3. administrators: Add restrictive trigger to prevent non-super-admin INSERT
CREATE OR REPLACE FUNCTION public.prevent_admin_self_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super administrators can create admin accounts';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_admin_insert ON public.administrators;
CREATE TRIGGER check_admin_insert
  BEFORE INSERT ON public.administrators
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_self_insert();