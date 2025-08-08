-- Create promo codes table
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  level INTEGER NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for promo codes
CREATE POLICY "Promo codes are viewable by everyone" 
ON public.promo_codes 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can insert promo codes" 
ON public.promo_codes 
FOR INSERT 
WITH CHECK (is_super_admin());

CREATE POLICY "Only admins can update promo codes" 
ON public.promo_codes 
FOR UPDATE 
USING (is_super_admin());

-- Create function to apply promo code
CREATE OR REPLACE FUNCTION public.apply_promo_code(code_text TEXT, user_uuid UUID, certification_level INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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