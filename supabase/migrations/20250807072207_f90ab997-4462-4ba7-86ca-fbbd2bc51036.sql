-- Add policy to allow public access to footer configuration
CREATE POLICY "Public can view footer configuration" 
ON site_configuration 
FOR SELECT 
USING (config_key = ANY (ARRAY[
  'footer_company_name',
  'footer_company_address', 
  'footer_company_phone',
  'footer_company_email',
  'footer_mentions_legales',
  'footer_politique_confidentialite',
  'footer_conditions_utilisation',
  'footer_copyright_text',
  'footer_social_facebook',
  'footer_social_twitter',
  'footer_social_linkedin', 
  'footer_social_instagram'
]));