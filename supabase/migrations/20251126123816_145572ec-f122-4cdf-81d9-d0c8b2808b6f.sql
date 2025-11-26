-- Ajouter une politique RLS pour permettre aux super admins de voir tous les utilisateurs
CREATE POLICY "Super admins can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (is_super_admin());

-- Ajouter une politique pour permettre aux super admins de supprimer des utilisateurs
CREATE POLICY "Super admins can delete users"
ON public.users
FOR DELETE
TO authenticated
USING (is_super_admin());