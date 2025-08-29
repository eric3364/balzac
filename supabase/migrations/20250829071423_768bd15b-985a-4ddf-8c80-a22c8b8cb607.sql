-- Créer la table pour les évaluations initiales
CREATE TABLE public.initial_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scores JSONB NOT NULL DEFAULT '{"conjugaison": 0, "grammaire": 0, "vocabulaire": 0, "overall": 0}',
  recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.initial_assessments ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own assessment" 
ON public.initial_assessments 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own assessment" 
ON public.initial_assessments 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own assessment" 
ON public.initial_assessments 
FOR UPDATE 
USING (user_id = auth.uid());

-- Créer un index pour optimiser les requêtes
CREATE INDEX idx_initial_assessments_user_id ON public.initial_assessments(user_id);

-- Assurer qu'un utilisateur ne peut avoir qu'une seule évaluation
CREATE UNIQUE INDEX idx_initial_assessments_unique_user ON public.initial_assessments(user_id);