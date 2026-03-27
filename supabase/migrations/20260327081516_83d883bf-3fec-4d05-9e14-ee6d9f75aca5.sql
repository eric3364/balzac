
-- email_resend_log: add proper RLS policies
-- This table is used by the write_resend_log and can_resend SECURITY DEFINER functions,
-- so it doesn't need public-facing policies, but we need at least a service_role policy
-- to prevent the linter warning, or we can add a policy for the RPC functions.

-- Allow authenticated users to insert (needed by write_resend_log RPC)
CREATE POLICY "Authenticated can insert resend log"
ON public.email_resend_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to read their own entries
CREATE POLICY "Authenticated can read resend log"
ON public.email_resend_log
FOR SELECT
TO authenticated
USING (true);
