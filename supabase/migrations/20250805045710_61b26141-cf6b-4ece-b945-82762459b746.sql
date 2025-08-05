-- Corriger le problème de sécurité de la fonction
DROP FUNCTION IF EXISTS public.update_difficulty_levels_updated_at();

CREATE OR REPLACE FUNCTION public.update_difficulty_levels_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;