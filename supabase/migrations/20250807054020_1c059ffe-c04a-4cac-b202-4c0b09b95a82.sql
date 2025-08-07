-- Créer des politiques RLS pour la table site_configuration
CREATE POLICY "Admins can view site configuration" 
ON public.site_configuration 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.administrators 
  WHERE user_id = auth.uid() 
  AND is_super_admin = true
));

CREATE POLICY "Admins can update site configuration" 
ON public.site_configuration 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.administrators 
  WHERE user_id = auth.uid() 
  AND is_super_admin = true
));

CREATE POLICY "Admins can insert site configuration" 
ON public.site_configuration 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.administrators 
  WHERE user_id = auth.uid() 
  AND is_super_admin = true
));

CREATE POLICY "Admins can delete site configuration" 
ON public.site_configuration 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.administrators 
  WHERE user_id = auth.uid() 
  AND is_super_admin = true
));