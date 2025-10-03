-- Enable RLS on super_admins table to protect administrator email addresses
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Only super admins can view the super_admins table
CREATE POLICY "Super admins can view super_admins table"
ON public.super_admins
FOR SELECT
TO authenticated
USING (is_super_admin());

-- Only super admins can insert into super_admins table
CREATE POLICY "Super admins can insert into super_admins table"
ON public.super_admins
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

-- Only super admins can update super_admins table
CREATE POLICY "Super admins can update super_admins table"
ON public.super_admins
FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Only super admins can delete from super_admins table
CREATE POLICY "Super admins can delete from super_admins table"
ON public.super_admins
FOR DELETE
TO authenticated
USING (is_super_admin());