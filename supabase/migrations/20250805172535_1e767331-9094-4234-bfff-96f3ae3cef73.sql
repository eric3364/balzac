-- Ajouter la configuration manquante pour le nombre de questions par test
INSERT INTO site_configuration (config_key, config_value, updated_by)
VALUES ('questions_per_test', '5', auth.uid())
ON CONFLICT (config_key) DO NOTHING;