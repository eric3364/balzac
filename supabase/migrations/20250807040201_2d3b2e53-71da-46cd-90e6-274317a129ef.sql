-- Permettre la lecture publique des certificats actifs
CREATE POLICY "Public can view active certificates" 
ON public.certificate_templates 
FOR SELECT 
USING (is_active = true);

-- Permettre la lecture publique des niveaux de difficulté actifs
CREATE POLICY "Public can view active difficulty levels" 
ON public.difficulty_levels 
FOR SELECT 
USING (is_active = true);