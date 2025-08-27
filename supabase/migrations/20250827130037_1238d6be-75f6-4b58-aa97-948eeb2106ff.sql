-- Corriger la fonction is_super_admin() pour qu'elle fonctionne correctement
DROP FUNCTION IF EXISTS public.is_super_admin();

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT a.is_super_admin 
    FROM public.administrators a
    WHERE a.user_id = auth.uid()
    AND a.is_super_admin = true
  ), false);
$$;