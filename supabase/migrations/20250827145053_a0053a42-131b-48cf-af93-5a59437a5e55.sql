-- Add admin policies for questions table
CREATE POLICY "Super admins can manage questions" 
ON public.questions 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Also ensure admins can read difficulty levels for question management
CREATE POLICY "Super admins can manage difficulty levels" 
ON public.difficulty_levels 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());