-- Add public policy for certification verification
CREATE POLICY "Public can verify certifications by credential_id" 
ON public.user_certifications 
FOR SELECT 
USING (credential_id IS NOT NULL);

-- Update existing policy to include public verification
DROP POLICY IF EXISTS "Users can view their own certifications" ON public.user_certifications;
CREATE POLICY "Users can view their own certifications" 
ON public.user_certifications 
FOR SELECT 
USING (user_id = auth.uid() OR credential_id IS NOT NULL);