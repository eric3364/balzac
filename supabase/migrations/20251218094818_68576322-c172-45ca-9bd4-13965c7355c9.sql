-- Allow authenticated users to read anti_cheat_enabled configuration
CREATE POLICY "Authenticated users can view anti cheat configuration"
ON public.site_configuration
FOR SELECT
TO authenticated
USING (config_key = 'anti_cheat_enabled');

-- Allow authenticated users to read questions for tests
CREATE POLICY "Authenticated users can view questions"
ON public.questions
FOR SELECT
TO authenticated
USING (true);