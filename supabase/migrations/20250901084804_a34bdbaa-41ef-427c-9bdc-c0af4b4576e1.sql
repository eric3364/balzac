-- Ajouter le paramètre pour le message d'instructions des tests
INSERT INTO public.site_configuration (config_key, config_value) 
VALUES ('test_instructions_message', '"Attention vos réponses doivent être écrites parfaitement en respectant la casse et la ponctuation éventuelle. Vous ne pouvez pas répondre réponse 1, 2 ou 3 ou bien A, B, C..!"')
ON CONFLICT (config_key) DO NOTHING;