-- Add anti-cheat configuration to site_configuration
INSERT INTO site_configuration (config_key, config_value, description, updated_by) 
VALUES (
  'anti_cheat_enabled',
  'true',
  'Active ou désactive le système anti-triche pendant les tests',
  null
) ON CONFLICT (config_key) DO NOTHING;