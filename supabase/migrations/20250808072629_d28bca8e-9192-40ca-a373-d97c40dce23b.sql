-- Ajouter les nouvelles clés de configuration pour la page d'accueil
INSERT INTO public.site_configuration (config_key, config_value) 
VALUES 
  ('cta_badge', '"Commencez dès maintenant"'),
  ('cta_sub_description', '"Démarrez gratuitement avec le niveau 1 puis progressez à votre rythme"')
ON CONFLICT (config_key) DO NOTHING;