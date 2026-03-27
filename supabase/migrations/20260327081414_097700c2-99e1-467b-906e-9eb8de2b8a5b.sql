
-- ============================================================
-- 1. Fix received_emails: restrict INSERT to service_role only
--    The current policy allows ANY public user to insert emails.
--    Replace with a policy restricted to service_role.
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert emails" ON public.received_emails;

CREATE POLICY "Only service role can insert emails"
ON public.received_emails
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================
-- 2. Clean duplicate RLS policies on difficulty_levels
--    Multiple overlapping SELECT and ALL policies exist.
-- ============================================================
DROP POLICY IF EXISTS "Super admins can view difficulty levels" ON public.difficulty_levels;
DROP POLICY IF EXISTS "Super admins can insert difficulty levels" ON public.difficulty_levels;
DROP POLICY IF EXISTS "Super admins can update difficulty levels" ON public.difficulty_levels;
DROP POLICY IF EXISTS "Super admins can delete difficulty levels" ON public.difficulty_levels;
DROP POLICY IF EXISTS "admins_manage_difficulty_levels" ON public.difficulty_levels;
DROP POLICY IF EXISTS "authenticated_read_difficulty_levels" ON public.difficulty_levels;
DROP POLICY IF EXISTS "Authenticated users can read difficulty levels" ON public.difficulty_levels;

-- Keep only: "Super admins can manage difficulty levels" (ALL) + one clean SELECT for authenticated
CREATE POLICY "Authenticated can read difficulty levels"
ON public.difficulty_levels
FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 3. Clean duplicate RLS policies on user_certifications
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own certifications" ON public.user_certifications;
-- Keep "Users can view own certifications" (same logic, remove duplicate)

-- ============================================================
-- 4. Clean duplicate RLS policies on user_level_purchases
--    Overlapping own/admin policies with simpler ones
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.user_level_purchases;
DROP POLICY IF EXISTS "Super admins can view all purchases" ON public.user_level_purchases;
DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.user_level_purchases;
-- Keep the own_or_admin versions which are more comprehensive

-- ============================================================
-- 5. Clean duplicate SELECT policies on test_answers
-- ============================================================
DROP POLICY IF EXISTS "permissive " ON public.test_answers;
-- Keep "Users can view their own test answers" which uses authenticated role

-- ============================================================
-- 6. Clean duplicate SELECT on question_attempts
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own question attempts" ON public.question_attempts;
-- Keep "Users can manage their own question attempts" (ALL) which covers SELECT
