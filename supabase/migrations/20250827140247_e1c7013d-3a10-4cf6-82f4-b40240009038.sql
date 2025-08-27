-- Corriger les politiques RLS pour la table questions
-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Questions are viewable by authenticated users" ON public.questions;
DROP POLICY IF EXISTS "Questions can be managed by super admins" ON public.questions;
DROP POLICY IF EXISTS "Super admins can view all questions" ON public.questions;
DROP POLICY IF EXISTS "Super admins can insert questions" ON public.questions;
DROP POLICY IF EXISTS "Super admins can update questions" ON public.questions;
DROP POLICY IF EXISTS "Super admins can delete questions" ON public.questions;

-- Créer les nouvelles politiques pour les questions
-- Politique pour la lecture - tous les utilisateurs authentifiés peuvent voir les questions
CREATE POLICY "Authenticated users can view questions"
ON public.questions
FOR SELECT
TO authenticated
USING (true);

-- Politiques pour les super admins - gestion complète des questions
CREATE POLICY "Super admins can insert questions"
ON public.questions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid() 
    AND is_super_admin = true
  )
);

CREATE POLICY "Super admins can update questions"
ON public.questions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid() 
    AND is_super_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid() 
    AND is_super_admin = true
  )
);

CREATE POLICY "Super admins can delete questions"
ON public.questions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid() 
    AND is_super_admin = true
  )
);

-- Vérifier que RLS est activé sur la table questions
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;