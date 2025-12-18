-- Drop the existing policy
DROP POLICY IF EXISTS "Super admins can delete users" ON public.users;

-- Create a corrected permissive policy that uses the correct is_super_admin() function
-- which checks the administrators table instead of super_admins table
CREATE POLICY "Super admins can delete users" 
ON public.users 
FOR DELETE 
TO authenticated
USING (is_super_admin());