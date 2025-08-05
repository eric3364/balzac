-- Create storage bucket for custom badges
INSERT INTO storage.buckets (id, name, public) 
VALUES ('custom-badges', 'custom-badges', true);

-- Create policies for custom badge uploads
CREATE POLICY "Public can view custom badges" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'custom-badges');

CREATE POLICY "Admins can upload custom badges" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'custom-badges' AND is_super_admin());

CREATE POLICY "Admins can update custom badges" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'custom-badges' AND is_super_admin());

CREATE POLICY "Admins can delete custom badges" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'custom-badges' AND is_super_admin());

-- Add custom badge URL column to certificate_templates
ALTER TABLE public.certificate_templates 
ADD COLUMN custom_badge_url TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.certificate_templates.custom_badge_url IS 'URL to custom uploaded badge image. If set, takes precedence over badge_icon.';