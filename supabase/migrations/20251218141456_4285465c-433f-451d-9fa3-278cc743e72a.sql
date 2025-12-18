-- Drop existing delete policy
DROP POLICY IF EXISTS "Super admins can delete users" ON public.users;

-- Create a more explicit delete policy using the parameterized function
CREATE POLICY "Super admins can delete users" 
ON public.users 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.administrators a
    WHERE a.user_id = auth.uid()
    AND COALESCE(a.is_super_admin, false) = true
  )
);