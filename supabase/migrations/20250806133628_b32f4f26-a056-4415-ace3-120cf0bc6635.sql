-- Permettre aux utilisateurs authentifiés de voir les niveaux de difficulté actifs
CREATE POLICY "Users can view active difficulty levels" 
ON public.difficulty_levels 
FOR SELECT 
USING (is_active = true);