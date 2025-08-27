-- Corriger les politiques RLS pour la table questions pour permettre aux super admins de les voir
-- Supprimer les politiques existantes qui créent des conflits
DROP POLICY IF EXISTS "Administrators can view all questions" ON public.questions;
DROP POLICY IF EXISTS "Administrators can create questions" ON public.questions;
DROP POLICY IF EXISTS "Administrators can update questions" ON public.questions;
DROP POLICY IF EXISTS "Administrators can delete questions" ON public.questions;

-- Créer des politiques RLS plus claires pour les questions
-- Les super admins peuvent tout faire
CREATE POLICY "Super admins can manage questions" 
ON public.questions 
FOR ALL 
USING (is_super_admin()) 
WITH CHECK (is_super_admin());

-- Les utilisateurs authentifiés peuvent lire les questions pour les tests
CREATE POLICY "Authenticated users can view questions" 
ON public.questions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Activer RLS sur la table resend_log
ALTER TABLE public.resend_log ENABLE ROW LEVEL SECURITY;

-- Créer des politiques pour resend_log
CREATE POLICY "Super admins can manage resend log" 
ON public.resend_log 
FOR ALL 
USING (is_super_admin()) 
WITH CHECK (is_super_admin());