-- Ajouter les colonnes pour le bandeau visuel et le logo de la homepage
INSERT INTO public.site_configuration (config_key, config_value, description) VALUES 
('homepage_logo_url', '', 'URL du logo affiché dans le header de la homepage'),
('homepage_banner_url', '', 'URL du bandeau visuel affiché en hero section de la homepage'),
('homepage_banner_alt', 'Bandeau visuel', 'Texte alternatif pour le bandeau visuel');

-- Créer le bucket pour les images de la homepage s'il n'existe pas déjà
INSERT INTO storage.buckets (id, name, public) 
VALUES ('homepage-assets', 'homepage-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies pour le bucket homepage-assets
CREATE POLICY "Homepage assets are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'homepage-assets');

CREATE POLICY "Admins can upload homepage assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'homepage-assets' AND public.is_super_admin());

CREATE POLICY "Admins can update homepage assets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'homepage-assets' AND public.is_super_admin());

CREATE POLICY "Admins can delete homepage assets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'homepage-assets' AND public.is_super_admin());