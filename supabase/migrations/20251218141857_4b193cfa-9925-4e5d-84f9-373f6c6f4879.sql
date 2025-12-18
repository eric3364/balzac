-- Create a new more robust function to check super admin status
CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  is_admin boolean;
BEGIN
  current_user_id := auth.uid();
  
  -- Debug: if no user logged in, return false
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check administrators table
  SELECT COALESCE(a.is_super_admin, false) INTO is_admin
  FROM public.administrators a
  WHERE a.user_id = current_user_id;
  
  RETURN COALESCE(is_admin, false);
END;
$$;

-- Update the delete policy to use the new function
DROP POLICY IF EXISTS "Super admins can delete users" ON public.users;

CREATE POLICY "Super admins can delete users" 
ON public.users 
FOR DELETE 
TO authenticated
USING (check_is_super_admin());