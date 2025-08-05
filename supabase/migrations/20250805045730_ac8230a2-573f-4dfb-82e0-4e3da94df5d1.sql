-- Corriger le problème de sécurité - supprimer d'abord le trigger
DROP TRIGGER IF EXISTS update_difficulty_levels_updated_at ON public.difficulty_levels;
DROP FUNCTION IF EXISTS public.update_difficulty_levels_updated_at();

-- Recréer la fonction avec les bonnes pratiques de sécurité
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

-- Recréer le trigger
CREATE TRIGGER update_difficulty_levels_updated_at
  BEFORE UPDATE ON public.difficulty_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_difficulty_levels_updated_at();