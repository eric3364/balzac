-- Create a simpler function that just checks if user is an admin
CREATE OR REPLACE FUNCTION public.is_any_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid()
  );
$$;

-- Update the delete policy to use this simpler function
DROP POLICY IF EXISTS "Super admins can delete users" ON public.users;

CREATE POLICY "Admins can delete users" 
ON public.users 
FOR DELETE 
TO authenticated
USING (is_any_admin());