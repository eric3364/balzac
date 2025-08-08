-- Add missing columns to user_certifications table
ALTER TABLE public.user_certifications 
ADD COLUMN IF NOT EXISTS credential_id TEXT UNIQUE NOT NULL DEFAULT ('CERT-' || EXTRACT(YEAR FROM NOW()) || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8))),
ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS issuing_organization TEXT DEFAULT 'Organisation',
ADD COLUMN IF NOT EXISTS json_ld_badge JSONB;

-- Create function to generate credential ID
CREATE OR REPLACE FUNCTION public.generate_credential_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'CERT-' || EXTRACT(YEAR FROM NOW()) || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Create function to generate certification metadata
CREATE OR REPLACE FUNCTION public.generate_certification_metadata()
RETURNS TRIGGER AS $$
DECLARE
  org_name TEXT;
  cert_title TEXT;
BEGIN
  -- Get organization name from site config or use default
  SELECT config_value::text FROM site_configuration WHERE config_key = 'cert_issuing_organization' INTO org_name;
  org_name := COALESCE(org_name, 'Organisation');
  
  -- Get certificate title from template or use default
  SELECT ct.certificate_title 
  FROM certificate_templates ct
  INNER JOIN difficulty_levels dl ON ct.difficulty_level_id = dl.id
  WHERE dl.level_number = NEW.level
  AND ct.is_active = true
  LIMIT 1 INTO cert_title;
  
  cert_title := COALESCE(cert_title, 'Certification Niveau ' || NEW.level);
  
  -- Set issuing organization
  NEW.issuing_organization := org_name;
  
  -- Generate credential ID if not provided
  IF NEW.credential_id IS NULL THEN
    NEW.credential_id := generate_credential_id();
  END IF;
  
  -- Set expiration date (2 years from certification)
  NEW.expiration_date := NEW.certified_at + INTERVAL '2 years';
  
  -- Generate JSON-LD badge metadata
  NEW.json_ld_badge := jsonb_build_object(
    '@context', 'https://w3id.org/openbadges/v2',
    'type', 'Assertion',
    'id', 'https://example.com/verify/' || NEW.credential_id,
    'badge', jsonb_build_object(
      'type', 'BadgeClass',
      'name', cert_title,
      'description', 'Certification obtenue avec un score de ' || NEW.score || '%',
      'issuer', jsonb_build_object(
        'type', 'Issuer',
        'name', org_name
      )
    ),
    'issuedOn', NEW.certified_at,
    'expires', NEW.expiration_date
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate metadata
DROP TRIGGER IF EXISTS generate_certification_metadata_trigger ON public.user_certifications;
CREATE TRIGGER generate_certification_metadata_trigger
  BEFORE INSERT ON public.user_certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_certification_metadata();

-- Update existing certifications with credential IDs and metadata
UPDATE public.user_certifications 
SET 
  credential_id = generate_credential_id(),
  issuing_organization = 'Organisation',
  expiration_date = certified_at + INTERVAL '2 years'
WHERE credential_id IS NULL;