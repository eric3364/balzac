-- Add a policy that allows users to check their own admin status
-- This breaks the circular dependency
CREATE POLICY "Users can check own admin status" 
ON public.administrators 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());