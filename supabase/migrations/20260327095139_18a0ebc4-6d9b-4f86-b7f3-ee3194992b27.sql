-- 1. Fix administrators INSERT policy: restrict to authenticated role only
DROP POLICY IF EXISTS "Super admins can insert administrators" ON public.administrators;
CREATE POLICY "Super admins can insert administrators"
  ON public.administrators
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- 2. Fix resend_log: add service_role INSERT policy for legitimate logging
CREATE POLICY "Service role can insert resend_log"
  ON public.resend_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 3. site_configuration: restrict public footer keys to exclude phone/address
DROP POLICY IF EXISTS "Public can view footer configuration" ON public.site_configuration;
CREATE POLICY "Public can view footer configuration"
  ON public.site_configuration
  FOR SELECT
  TO public
  USING (config_key = ANY (ARRAY[
    'footer_company_name',
    'footer_mentions_legales',
    'footer_politique_confidentialite',
    'footer_conditions_utilisation',
    'footer_copyright_text',
    'footer_social_facebook',
    'footer_social_twitter',
    'footer_social_linkedin',
    'footer_social_instagram'
  ]));