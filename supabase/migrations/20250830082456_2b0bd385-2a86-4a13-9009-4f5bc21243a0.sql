-- Add anti-cheat configuration to site_configuration
INSERT INTO site_configuration (config_key, config_value, updated_by) 
VALUES (
  'anti_cheat_enabled',
  'true',
  null
) ON CONFLICT (config_key) DO NOTHING;