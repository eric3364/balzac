-- Table pour la gestion des prix des niveaux
CREATE TABLE public.level_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER NOT NULL UNIQUE,
  price_euros DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  free_sessions INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Table pour les achats d'utilisateurs
CREATE TABLE public.user_level_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  price_paid DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, level)
);

-- RLS pour level_pricing
ALTER TABLE public.level_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active pricing" ON public.level_pricing
  FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can manage pricing" ON public.level_pricing
  FOR ALL USING (is_super_admin());

-- RLS pour user_level_purchases  
ALTER TABLE public.user_level_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases" ON public.user_level_purchases
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own purchases" ON public.user_level_purchases
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all purchases" ON public.user_level_purchases
  FOR SELECT USING (is_super_admin());

-- Insérer les prix par défaut pour les niveaux 1-5
INSERT INTO public.level_pricing (level, price_euros, free_sessions) VALUES
  (1, 0.00, 10), -- Niveau 1 entièrement gratuit
  (2, 10.00, 3),
  (3, 10.00, 3), 
  (4, 10.00, 3),
  (5, 10.00, 3);

-- Fonction pour vérifier si un utilisateur a acheté un niveau
CREATE OR REPLACE FUNCTION public.user_has_purchased_level(user_uuid UUID, level_num INTEGER)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
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

-- Fonction pour obtenir le nombre de sessions gratuites pour un niveau
CREATE OR REPLACE FUNCTION public.get_free_sessions_for_level(level_num INTEGER)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(free_sessions, 3)
  FROM public.level_pricing
  WHERE level = level_num AND is_active = true
  LIMIT 1;
$$;