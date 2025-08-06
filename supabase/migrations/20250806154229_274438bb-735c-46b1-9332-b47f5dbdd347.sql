-- Corriger les fonctions avec search_path mutable
CREATE OR REPLACE FUNCTION public.user_has_purchased_level(user_uuid UUID, level_num INTEGER)
RETURNS BOOLEAN
LANGUAGE SQL
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
    SELECT COALESCE(price_euros, 10.00) = 0.00
    FROM public.level_pricing
    WHERE level = level_num
    LIMIT 1
  );
$$;

CREATE OR REPLACE FUNCTION public.get_free_sessions_for_level(level_num INTEGER)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SET search_path = 'public'
AS $$
  SELECT COALESCE(free_sessions, 3)
  FROM public.level_pricing
  WHERE level = level_num AND is_active = true
  LIMIT 1;
$$;