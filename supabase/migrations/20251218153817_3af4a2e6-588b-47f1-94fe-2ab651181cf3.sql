-- Drop existing delete policy
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Create a simpler DELETE policy that directly checks administrators table
CREATE POLICY "Admins can delete users" 
ON public.users 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE administrators.user_id = auth.uid()
  )
);