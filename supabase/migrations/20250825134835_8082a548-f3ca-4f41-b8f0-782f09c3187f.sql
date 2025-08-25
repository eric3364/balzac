-- Insérer les configurations manquantes pour la page d'accueil
INSERT INTO public.site_configuration (config_key, config_value) VALUES
('feature1_title', '"Tests adaptatifs intelligents"'),
('feature1_description', '"Évaluations personnalisées adaptées à votre niveau avec l''IA"'),
('feature2_title', '"Certifications reconnues"'),
('feature2_description', '"Certifications officielles valorisables professionnellement"'),
('feature3_title', '"Progression en temps réel"'),
('feature3_description', '"Tableaux de bord détaillés et statistiques personnalisées"'),
('feature4_title', '"Apprentissage flexible"'),
('feature4_description', '"Apprenez à votre rythme avec un accès 24h/24"'),
('feature5_title', '"Communauté active"'),
('feature5_description', '"Communauté d''apprenants et accompagnement personnalisé"'),
('feature6_title', '"Excellence garantie"'),
('feature6_description', '"Méthodes pédagogiques éprouvées basées sur les dernières recherches en sciences cognitives"'),
('stats_title', '"Nos résultats parlent d''eux-mêmes"'),
('stats_description', '"Des chiffres qui témoignent de notre excellence"')
ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  last_updated = now();

-- S'assurer que les valeurs CTA existent aussi
INSERT INTO public.site_configuration (config_key, config_value) VALUES
('cta_title', '"Travaillez votre employabilité"'),
('cta_sub_description', '"Démarrez gratuitement avec le niveau 1 puis progressez à votre rythme"')
ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  last_updated = now();