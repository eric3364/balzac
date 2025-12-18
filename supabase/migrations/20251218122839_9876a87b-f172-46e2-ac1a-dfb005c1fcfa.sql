-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Super admins can delete users" ON public.users;

-- Create a permissive policy for super admins to delete users
CREATE POLICY "Super admins can delete users" 
ON public.users 
FOR DELETE 
TO authenticated
USING (is_super_admin(auth.uid()));