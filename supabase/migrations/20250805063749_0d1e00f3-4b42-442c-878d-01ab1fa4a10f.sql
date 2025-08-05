-- Créer les politiques RLS pour la table questions
-- Les administrateurs peuvent tout faire sur les questions

-- Politique pour permettre aux administrateurs de voir toutes les questions
CREATE POLICY "Administrators can view all questions" 
ON public.questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid()
  )
);

-- Politique pour permettre aux administrateurs de créer des questions
CREATE POLICY "Administrators can create questions" 
ON public.questions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid()
  )
);

-- Politique pour permettre aux administrateurs de modifier des questions
CREATE POLICY "Administrators can update questions" 
ON public.questions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid()
  )
);

-- Politique pour permettre aux administrateurs de supprimer des questions
CREATE POLICY "Administrators can delete questions" 
ON public.questions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid()
  )
);

-- Politique pour permettre aux utilisateurs authentifiés de voir les questions (pour les tests)
CREATE POLICY "Authenticated users can view questions for tests" 
ON public.questions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);