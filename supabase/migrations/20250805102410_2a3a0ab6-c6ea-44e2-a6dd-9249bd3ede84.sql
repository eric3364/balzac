-- Créer une politique pour permettre la lecture publique des configurations de la page d'accueil
CREATE POLICY "Public can view homepage configuration" 
ON public.site_configuration 
FOR SELECT 
USING (
  config_key IN (
    'homepage_logo_url', 'homepage_banner_url', 'homepage_banner_alt',
    'site_title', 'site_subtitle', 'hero_title', 'hero_description',
    'hero_cta_primary', 'hero_cta_secondary', 'features_title', 'features_description',
    'stat1_number', 'stat1_label', 'stat2_number', 'stat2_label', 'stat3_number', 'stat3_label',
    'cta_title', 'cta_description', 'cta_button'
  )
);