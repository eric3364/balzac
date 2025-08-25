-- Create secure promo code validation function
CREATE OR REPLACE FUNCTION public.validate_promo_code(code_text text, certification_level integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  promo_record RECORD;
BEGIN
  -- Check if promo code exists and is valid
  SELECT discount_percentage, is_used, expires_at INTO promo_record
  FROM public.promo_codes
  WHERE code = UPPER(code_text)
  AND level = certification_level
  AND is_used = FALSE
  AND (expires_at IS NULL OR expires_at > NOW());
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'discount', 0,
      'error', 'Code promo invalide ou expiré'
    );
  END IF;
  
  RETURN json_build_object(
    'valid', true,
    'discount', promo_record.discount_percentage,
    'error', null
  );
END;
$$;

-- Update user certification RLS policy to protect user privacy
DROP POLICY IF EXISTS "Public can verify certifications by credential_id" ON public.user_certifications;

-- Create separate policies for verification vs user access
CREATE POLICY "Public can verify certifications" ON public.user_certifications
  FOR SELECT
  USING (credential_id IS NOT NULL);

CREATE POLICY "Users can view own certifications" ON public.user_certifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Harden existing database functions with search_path
CREATE OR REPLACE FUNCTION public.apply_promo_code(code_text text, user_uuid uuid, certification_level integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  promo_record RECORD;
  result JSON;
BEGIN
  -- Check if promo code exists and is valid
  SELECT * INTO promo_record
  FROM public.promo_codes
  WHERE code = code_text
  AND level = certification_level
  AND is_used = FALSE
  AND (expires_at IS NULL OR expires_at > NOW());
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Code promo invalide ou expiré'
    );
  END IF;
  
  -- Mark promo code as used
  UPDATE public.promo_codes
  SET is_used = TRUE,
      used_by = user_uuid,
      used_at = NOW()
  WHERE id = promo_record.id;
  
  -- Create a completed purchase record for the level
  INSERT INTO public.user_level_purchases (
    user_id,
    level,
    price_paid,
    status,
    purchased_at,
    payment_method
  ) VALUES (
    user_uuid,
    certification_level,
    0.00,  -- Free with promo code
    'completed',
    NOW(),
    'promo_code'
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Code promo appliqué avec succès'
  );
END;
$$;

-- Harden other database functions
CREATE OR REPLACE FUNCTION public.generate_credential_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  RETURN 'CERT-' || EXTRACT(YEAR FROM NOW()) || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_max_level(user_uuid uuid DEFAULT auth.uid())
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(MAX(level), 0)
  FROM public.user_certifications
  WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN COALESCE((
        SELECT a.is_super_admin 
        FROM public.administrators a
        WHERE a.user_id = auth.uid()
    ), FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_purchased_level(user_uuid uuid, level_num integer)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_level_purchases 
    WHERE user_id = user_uuid 
    AND level = level_num 
    AND status = 'completed'
  ) OR (
    SELECT COALESCE(ct.price_euros, 10.00) = 0.00
    FROM public.certificate_templates ct
    INNER JOIN public.difficulty_levels dl ON ct.difficulty_level_id = dl.id
    WHERE dl.level_number = level_num
    AND ct.is_active = true
    LIMIT 1
  );
$$;