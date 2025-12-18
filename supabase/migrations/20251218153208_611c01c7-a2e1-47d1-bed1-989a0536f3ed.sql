-- Drop the restrictive DELETE policy
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Create a PERMISSIVE DELETE policy (default behavior)
CREATE POLICY "Admins can delete users" 
ON public.users 
FOR DELETE 
USING (is_any_admin());