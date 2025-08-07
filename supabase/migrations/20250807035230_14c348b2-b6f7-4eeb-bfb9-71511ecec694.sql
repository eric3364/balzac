-- Ajouter les colonnes de prix aux templates de certificats
ALTER TABLE public.certificate_templates 
ADD COLUMN IF NOT EXISTS price_euros NUMERIC(8,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS free_sessions INTEGER DEFAULT 3;

-- Supprimer la table level_pricing qui ne sera plus utilisée
DROP TABLE IF EXISTS public.level_pricing;

-- Créer un index pour améliorer les performances des requêtes de prix
CREATE INDEX IF NOT EXISTS idx_certificate_templates_pricing 
ON public.certificate_templates(price_euros, is_active);

-- Mettre à jour la fonction user_has_purchased_level pour utiliser les templates de certificats
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

-- Mettre à jour la fonction get_free_sessions_for_level pour utiliser les templates de certificats
CREATE OR REPLACE FUNCTION public.get_free_sessions_for_level(level_num integer)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT COALESCE(ct.free_sessions, 3)
  FROM public.certificate_templates ct
  INNER JOIN public.difficulty_levels dl ON ct.difficulty_level_id = dl.id
  WHERE dl.level_number = level_num 
  AND ct.is_active = true
  LIMIT 1;
$$;