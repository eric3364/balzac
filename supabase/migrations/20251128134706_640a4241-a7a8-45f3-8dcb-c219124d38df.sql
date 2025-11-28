-- Fix hardcoded admin UUID in RLS policy (security backdoor)
DROP POLICY IF EXISTS "questions_manage_known_admin" ON public.questions;

-- Fix mutable search paths on remaining functions
CREATE OR REPLACE FUNCTION public.generate_certification_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  org_name TEXT;
  cert_title TEXT;
BEGIN
  SELECT config_value::text FROM site_configuration WHERE config_key = 'cert_issuing_organization' INTO org_name;
  org_name := COALESCE(org_name, 'Organisation');
  
  SELECT ct.certificate_title 
  FROM certificate_templates ct
  INNER JOIN difficulty_levels dl ON ct.difficulty_level_id = dl.id
  WHERE dl.level_number = NEW.level
  AND ct.is_active = true
  LIMIT 1 INTO cert_title;
  
  cert_title := COALESCE(cert_title, 'Certification Niveau ' || NEW.level);
  
  NEW.issuing_organization := org_name;
  
  IF NEW.credential_id IS NULL THEN
    NEW.credential_id := generate_credential_id();
  END IF;
  
  NEW.expiration_date := NEW.certified_at + INTERVAL '2 years';
  
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
$function$;

CREATE OR REPLACE FUNCTION public.auto_generate_access_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND NEW.temporary_access_code IS NULL THEN
    NEW.temporary_access_code := generate_temporary_access_code();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 
             CONCAT(NEW.raw_user_meta_data ->> 'first_name', ' ', NEW.raw_user_meta_data ->> 'last_name'))
  );
  
  INSERT INTO public.users (user_id, email, first_name, last_name, school, class_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'school',
    NEW.raw_user_meta_data ->> 'class_name'
  );
  
  RETURN NEW;
END;
$function$;

-- Restrict public certification access - only allow owner or verification via dedicated endpoint
DROP POLICY IF EXISTS "Public can verify certifications" ON public.user_certifications;
DROP POLICY IF EXISTS "Users can view their own certifications" ON public.user_certifications;

CREATE POLICY "Users can view their own certifications" 
ON public.user_certifications 
FOR SELECT 
USING (user_id = auth.uid());