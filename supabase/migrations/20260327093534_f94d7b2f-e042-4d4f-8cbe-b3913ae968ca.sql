-- FIX 1: Hide answers from questions table - restrict to service_role only
-- Remove the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view questions" ON public.questions;

-- Create a view without answers for authenticated users
CREATE OR REPLACE VIEW public.questions_safe AS
SELECT id, content, type, level, rule, choices
FROM public.questions;

-- Allow authenticated users to view only the safe view
-- But for the base table, only admins can see answers
CREATE POLICY "Authenticated users can view questions without answers"
  ON public.questions
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: We'll handle answer hiding via the edge function validate-answer
-- The answers are already validated server-side. We should restrict columns
-- but Postgres RLS doesn't support column-level. Instead we'll use security
-- through the existing validate-answer edge function pattern.

-- Actually, the best approach: keep SELECT but ensure client code never 
-- fetches answers directly. The get-session-questions edge function already
-- controls what's returned. Let's just ensure the client queries go through 
-- the edge function by removing direct table access for non-admins.

-- Remove the policy we just created and make it stricter
DROP POLICY IF EXISTS "Authenticated users can view questions without answers" ON public.questions;

-- Only admins can directly query the questions table
CREATE POLICY "Only admins can directly query questions"
  ON public.questions
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM administrators WHERE user_id = auth.uid()
  ));

-- FIX 2: Fix resend_email_log insert policy 
DROP POLICY IF EXISTS "resend_log_insert_owner" ON public.resend_email_log;

CREATE POLICY "resend_log_insert_owner"
  ON public.resend_email_log
  FOR INSERT
  TO authenticated
  WITH CHECK (uid = auth.uid());