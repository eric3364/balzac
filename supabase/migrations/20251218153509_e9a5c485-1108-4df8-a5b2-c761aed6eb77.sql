-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can check own admin status" ON public.administrators;

-- Recreate as PERMISSIVE (which is the default, but being explicit)
CREATE POLICY "Users can check own admin status" 
ON public.administrators 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());