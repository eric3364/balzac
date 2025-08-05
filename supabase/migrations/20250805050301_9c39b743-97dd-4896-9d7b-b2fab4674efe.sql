-- Créer une table pour les modèles de certificats
CREATE TABLE public.certificate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  difficulty_level_id UUID NOT NULL REFERENCES public.difficulty_levels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  min_score_required INTEGER NOT NULL DEFAULT 70,
  min_questions_correct INTEGER,
  time_limit_seconds INTEGER,
  certificate_title TEXT NOT NULL,
  certificate_subtitle TEXT,
  certificate_text TEXT NOT NULL,
  certificate_background_color TEXT DEFAULT '#ffffff',
  certificate_border_color TEXT DEFAULT '#6366f1',
  certificate_text_color TEXT DEFAULT '#000000',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(difficulty_level_id)
);

-- Enable RLS
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

-- Create policies pour permettre aux super admins de gérer les modèles
CREATE POLICY "Super admins can view certificate templates" 
ON public.certificate_templates 
FOR SELECT 
USING (is_super_admin());

CREATE POLICY "Super admins can insert certificate templates" 
ON public.certificate_templates 
FOR INSERT 
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update certificate templates" 
ON public.certificate_templates 
FOR UPDATE 
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can delete certificate templates" 
ON public.certificate_templates 
FOR DELETE 
USING (is_super_admin());

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_certificate_templates_updated_at()
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

-- Créer le trigger
CREATE TRIGGER update_certificate_templates_updated_at
  BEFORE UPDATE ON public.certificate_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_certificate_templates_updated_at();

-- Insérer des modèles de certificats par défaut pour chaque niveau
INSERT INTO public.certificate_templates (
  difficulty_level_id, 
  name, 
  description, 
  min_score_required,
  certificate_title,
  certificate_subtitle,
  certificate_text,
  certificate_background_color,
  certificate_border_color
)
SELECT 
  dl.id,
  'Certificat ' || dl.name,
  'Certificat de réussite pour le niveau ' || dl.name,
  CASE 
    WHEN dl.level_number = 1 THEN 60
    WHEN dl.level_number = 2 THEN 65
    WHEN dl.level_number = 3 THEN 70
    WHEN dl.level_number = 4 THEN 75
    ELSE 80
  END,
  'Certificat de Réussite',
  'Niveau ' || dl.name || ' - Français',
  'Ceci certifie que {student_name} a réussi avec succès l''évaluation de français de niveau ' || dl.name || ' avec un score de {score}% le {date}. Cette certification atteste de la maîtrise des compétences linguistiques correspondant à ce niveau.',
  '#ffffff',
  dl.color
FROM public.difficulty_levels dl
WHERE dl.is_active = true;