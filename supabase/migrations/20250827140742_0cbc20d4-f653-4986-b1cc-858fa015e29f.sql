-- Créer une politique temporaire pour permettre l'accès aux questions pour l'administrateur spécifique
-- Supprimer les politiques actuelles
DROP POLICY IF EXISTS "questions_read_authenticated" ON public.questions;
DROP POLICY IF EXISTS "questions_insert_super_admins" ON public.questions;
DROP POLICY IF EXISTS "questions_update_super_admins" ON public.questions;
DROP POLICY IF EXISTS "questions_delete_super_admins" ON public.questions;

-- Créer une politique qui permet à tous les utilisateurs authentifiés de lire les questions
CREATE POLICY "questions_read_all_authenticated"
ON public.questions
FOR SELECT
TO authenticated
USING (true);

-- Créer une politique qui permet aux administrateurs spécifiques de gérer les questions
CREATE POLICY "questions_manage_known_admin"
ON public.questions
FOR ALL
TO authenticated
USING (
  auth.uid() = 'e4bdb8cd-31af-4a49-b008-579f228ddd76'::uuid
  OR is_super_admin()
)
WITH CHECK (
  auth.uid() = 'e4bdb8cd-31af-4a49-b008-579f228ddd76'::uuid
  OR is_super_admin()
);