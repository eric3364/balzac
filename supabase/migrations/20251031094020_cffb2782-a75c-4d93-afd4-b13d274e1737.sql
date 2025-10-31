-- Secure questions table by removing direct client access
-- Only admins can read questions directly, regular users must use edge functions

-- Drop existing policies for regular users
DROP POLICY IF EXISTS "Authenticated users can read questions" ON public.questions;
DROP POLICY IF EXISTS "authenticated_read_questions" ON public.questions;
DROP POLICY IF EXISTS "questions_read_all_authenticated" ON public.questions;

-- Keep only admin access policy
-- The "Super admins can manage questions" and other admin policies remain

-- Add a comment explaining the security model
COMMENT ON TABLE public.questions IS 'Questions table - Direct access restricted to admins only. Regular users must use get-session-questions edge function which does not expose correct answers.';
