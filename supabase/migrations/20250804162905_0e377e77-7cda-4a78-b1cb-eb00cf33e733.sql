-- Insert default configuration for questions per test
INSERT INTO public.site_configuration (config_key, config_value)
VALUES ('questions_per_test', '5'::jsonb)
ON CONFLICT (config_key) DO NOTHING;