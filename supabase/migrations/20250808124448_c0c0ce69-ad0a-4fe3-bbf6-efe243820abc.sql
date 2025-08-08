-- Ajouter une colonne pour le code d'accès temporaire dans la table user_level_purchases
ALTER TABLE public.user_level_purchases 
ADD COLUMN temporary_access_code TEXT,
ADD COLUMN access_code_used BOOLEAN DEFAULT FALSE,
ADD COLUMN payment_method TEXT DEFAULT 'stripe';

-- Fonction pour générer un code d'accès temporaire
CREATE OR REPLACE FUNCTION public.generate_temporary_access_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
BEGIN
  -- Générer un code de 8 caractères alphanumériques
  code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 8));
  RETURN code;
END;
$$;

-- Trigger pour générer automatiquement un code d'accès temporaire lors de l'achat
CREATE OR REPLACE FUNCTION public.auto_generate_access_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Générer un code d'accès temporaire si le statut est 'completed' et qu'il n'y en a pas déjà un
  IF NEW.status = 'completed' AND NEW.temporary_access_code IS NULL THEN
    NEW.temporary_access_code := generate_temporary_access_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Créer le trigger sur les achats
CREATE TRIGGER trigger_generate_access_code
  BEFORE INSERT OR UPDATE ON public.user_level_purchases
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_access_code();