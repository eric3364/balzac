-- Table pour les objectifs de planification par groupe (école/classe)
CREATE TABLE public.planning_objectives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school text NOT NULL,
  class_name text,
  objective_type text NOT NULL DEFAULT 'certification', -- 'certification' ou 'progression'
  target_certification_level integer, -- niveau de certification cible (si type = certification)
  target_progression_percentage integer, -- pourcentage de progression cible (si type = progression)
  deadline timestamp with time zone NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.planning_objectives ENABLE ROW LEVEL SECURITY;

-- Policies: Super admins can manage planning objectives
CREATE POLICY "Super admins can manage planning objectives"
ON public.planning_objectives
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Authenticated users can view active planning objectives
CREATE POLICY "Authenticated users can view planning objectives"
ON public.planning_objectives
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Index for faster queries
CREATE INDEX idx_planning_objectives_school_class ON public.planning_objectives(school, class_name);
CREATE INDEX idx_planning_objectives_deadline ON public.planning_objectives(deadline);

-- Trigger for updated_at
CREATE TRIGGER update_planning_objectives_updated_at
BEFORE UPDATE ON public.planning_objectives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();