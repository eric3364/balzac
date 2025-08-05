-- Créer une table pour gérer les niveaux de difficulté personnalisés
CREATE TABLE public.difficulty_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.difficulty_levels ENABLE ROW LEVEL SECURITY;

-- Create policies pour permettre aux super admins de gérer les niveaux
CREATE POLICY "Super admins can view difficulty levels" 
ON public.difficulty_levels 
FOR SELECT 
USING (is_super_admin());

CREATE POLICY "Super admins can insert difficulty levels" 
ON public.difficulty_levels 
FOR INSERT 
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update difficulty levels" 
ON public.difficulty_levels 
FOR UPDATE 
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can delete difficulty levels" 
ON public.difficulty_levels 
FOR DELETE 
USING (is_super_admin());

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_difficulty_levels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
CREATE TRIGGER update_difficulty_levels_updated_at
  BEFORE UPDATE ON public.difficulty_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_difficulty_levels_updated_at();

-- Insérer des niveaux par défaut
INSERT INTO public.difficulty_levels (level_number, name, description, color) VALUES
(1, 'Débutant', 'Questions de base pour les apprenants débutants', '#10b981'),
(2, 'Élémentaire', 'Questions de niveau élémentaire', '#3b82f6'),
(3, 'Intermédiaire', 'Questions de difficulté moyenne', '#f59e0b'),
(4, 'Avancé', 'Questions complexes pour niveau avancé', '#ef4444'),
(5, 'Expert', 'Questions très difficiles pour experts', '#8b5cf6');