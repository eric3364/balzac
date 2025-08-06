-- Ajouter un paramètre de configuration pour le pourcentage de questions par niveau
-- Ce paramètre définit quel pourcentage du total des questions d'un niveau sera utilisé dans une session

INSERT INTO public.site_configuration (config_key, config_value, updated_by) 
VALUES ('questions_percentage_per_level', '80'::jsonb, NULL)
ON CONFLICT (config_key) DO NOTHING;