
-- Fix the overly permissive INSERT policy on email_resend_log
-- Since write_resend_log is SECURITY DEFINER, it bypasses RLS.
-- We don't need a permissive INSERT for authenticated users.
DROP POLICY IF EXISTS "Authenticated can insert resend log" ON public.email_resend_log;

-- Instead, only allow service_role to insert directly
CREATE POLICY "Service role can insert resend log"
ON public.email_resend_log
FOR INSERT
TO service_role
WITH CHECK (true);
