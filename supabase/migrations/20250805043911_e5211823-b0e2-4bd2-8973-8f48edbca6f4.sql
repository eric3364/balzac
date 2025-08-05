-- Corriger les politiques RLS de la table administrators pour éviter la récursion infinie

-- Supprimer les politiques problématiques
DROP POLICY IF EXISTS "Super admins can manage administrators" ON public.administrators;
DROP POLICY IF EXISTS "Admins can view all administrators" ON public.administrators;
DROP POLICY IF EXISTS "Super admins can insert administrators" ON public.administrators;
DROP POLICY IF EXISTS "Super admins can update administrators" ON public.administrators;
DROP POLICY IF EXISTS "Super admins can delete administrators" ON public.administrators;

-- Recréer les politiques en utilisant uniquement la fonction is_super_admin()
CREATE POLICY "Super admins can view administrators" 
ON public.administrators 
FOR SELECT 
USING (is_super_admin());

CREATE POLICY "Super admins can insert administrators" 
ON public.administrators 
FOR INSERT 
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update administrators" 
ON public.administrators 
FOR UPDATE 
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can delete administrators" 
ON public.administrators 
FOR DELETE 
USING (is_super_admin());