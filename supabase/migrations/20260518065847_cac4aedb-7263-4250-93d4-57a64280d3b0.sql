
-- Restrict badges folder uploads in public bucket to admins only
DROP POLICY IF EXISTS "Authenticated users can upload badges" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own badges" ON storage.objects;

CREATE POLICY "Admins can upload badges"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'badges'
  AND is_any_admin()
);

CREATE POLICY "Admins can delete badges"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'badges'
  AND is_any_admin()
);

-- Restrict email_resend_log SELECT to super admins only (IP/email PII)
DROP POLICY IF EXISTS "Admins can read resend log" ON public.email_resend_log;

CREATE POLICY "Super admins can read resend log"
ON public.email_resend_log FOR SELECT
TO authenticated
USING (is_super_admin());
