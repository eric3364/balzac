-- Fix remaining security issues

-- Fix issue 1: Add missing RLS policies for administrators table
-- (The linter detected administrators table has RLS enabled but missing some policies)
CREATE POLICY "Admins can view all administrators" 
ON public.administrators 
FOR SELECT 
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admins can insert administrators" 
ON public.administrators 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update administrators" 
ON public.administrators 
FOR UPDATE 
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete administrators" 
ON public.administrators 
FOR DELETE 
TO authenticated
USING (public.is_super_admin());

-- Add missing RLS policies for site_configuration table if needed
CREATE POLICY "Super admins can view site configuration" 
ON public.site_configuration 
FOR SELECT 
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admins can insert site configuration" 
ON public.site_configuration 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update site configuration" 
ON public.site_configuration 
FOR UPDATE 
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete site configuration" 
ON public.site_configuration 
FOR DELETE 
TO authenticated
USING (public.is_super_admin());