-- Fix SECURITY DEFINER functions without fixed search_path
-- This prevents SQL injection attacks through search path manipulation

-- Fix apply_promo_code function
CREATE OR REPLACE FUNCTION public.apply_promo_code(code_text text, user_uuid uuid, certification_level integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    0.00,
    'completed',
    NOW(),
    'promo_code'
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Code promo appliqué avec succès'
  );
END;
$function$;

-- Fix generate_credential_id function
CREATE OR REPLACE FUNCTION public.generate_credential_id()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN 'CERT-' || EXTRACT(YEAR FROM NOW()) || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
END;
$function$;

-- Fix get_user_max_level function
CREATE OR REPLACE FUNCTION public.get_user_max_level(user_uuid uuid DEFAULT auth.uid())
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(MAX(level), 0)
  FROM public.user_certifications
  WHERE user_id = user_uuid;
$function$;