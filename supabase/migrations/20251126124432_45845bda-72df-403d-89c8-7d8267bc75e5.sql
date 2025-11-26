-- Permettre aux super admins de voir toutes les sessions de test
CREATE POLICY "Super admins can view all test sessions"
ON public.test_sessions
FOR SELECT
TO authenticated
USING (is_super_admin());

-- Permettre aux super admins de voir toutes les tentatives de questions
CREATE POLICY "Super admins can view all question attempts"
ON public.question_attempts
FOR SELECT
TO authenticated
USING (is_super_admin());

-- Permettre aux super admins de voir toutes les certifications
CREATE POLICY "Super admins can view all certifications"
ON public.user_certifications
FOR SELECT
TO authenticated
USING (is_super_admin());