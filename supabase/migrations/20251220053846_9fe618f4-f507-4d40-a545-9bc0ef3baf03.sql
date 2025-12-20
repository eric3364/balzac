-- Supprimer les policies dupliquées/conflictuelles sur la table questions
DROP POLICY IF EXISTS "Super admins can manage questions" ON public.questions;
DROP POLICY IF EXISTS "admin_manage_questions" ON public.questions;
DROP POLICY IF EXISTS "admins_manage_questions" ON public.questions;

-- Créer une seule policy permissive pour les admins
CREATE POLICY "Admins can manage questions"
ON public.questions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE administrators.user_id = auth.uid() 
    AND COALESCE(administrators.is_super_admin, false) = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE administrators.user_id = auth.uid() 
    AND COALESCE(administrators.is_super_admin, false) = true
  )
);