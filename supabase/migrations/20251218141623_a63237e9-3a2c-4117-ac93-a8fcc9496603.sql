-- Drop existing delete policy
DROP POLICY IF EXISTS "Super admins can delete users" ON public.users;

-- Recreate using the SECURITY DEFINER function which handles auth context better
CREATE POLICY "Super admins can delete users" 
ON public.users 
FOR DELETE 
TO authenticated
USING (is_super_admin());