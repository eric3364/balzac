-- Supprimer toutes les politiques existantes sur la table questions
DROP POLICY IF EXISTS "Questions are viewable by authenticated users" ON public.questions;
DROP POLICY IF EXISTS "Questions can be managed by super admins" ON public.questions;
DROP POLICY IF EXISTS "Super admins can view all questions" ON public.questions;
DROP POLICY IF EXISTS "Super admins can insert questions" ON public.questions;
DROP POLICY IF EXISTS "Super admins can update questions" ON public.questions;
DROP POLICY IF EXISTS "Super admins can delete questions" ON public.questions;
DROP POLICY IF EXISTS "Authenticated users can view questions" ON public.questions;
DROP POLICY IF EXISTS "Authenticated users can select questions" ON public.questions;
DROP POLICY IF EXISTS "Authenticated users can view questions for tests" ON public.questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
DROP POLICY IF EXISTS "Super admins can manage questions" ON public.questions;
DROP POLICY IF EXISTS "questions_delete_admins" ON public.questions;
DROP POLICY IF EXISTS "questions_insert_admins" ON public.questions;
DROP POLICY IF EXISTS "questions_read_public" ON public.questions;
DROP POLICY IF EXISTS "questions_update_admins" ON public.questions;

-- Créer une seule politique simple pour la lecture par tous les utilisateurs authentifiés
CREATE POLICY "questions_read_authenticated"
ON public.questions
FOR SELECT
TO authenticated
USING (true);

-- Créer les politiques pour les super admins uniquement
CREATE POLICY "questions_insert_super_admins"
ON public.questions
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "questions_update_super_admins"
ON public.questions
FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "questions_delete_super_admins"
ON public.questions
FOR DELETE
TO authenticated
USING (is_super_admin());

-- S'assurer que RLS est activé
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;