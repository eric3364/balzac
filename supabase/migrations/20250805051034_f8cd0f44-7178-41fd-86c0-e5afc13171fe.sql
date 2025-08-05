-- Ajouter des colonnes pour la représentation graphique des badges
ALTER TABLE public.certificate_templates ADD COLUMN badge_icon TEXT DEFAULT 'award';
ALTER TABLE public.certificate_templates ADD COLUMN badge_color TEXT DEFAULT '#6366f1';
ALTER TABLE public.certificate_templates ADD COLUMN badge_background_color TEXT DEFAULT '#ffffff';
ALTER TABLE public.certificate_templates ADD COLUMN badge_size TEXT DEFAULT 'medium';

-- Mettre à jour les badges existants avec des icônes appropriées selon le niveau
UPDATE public.certificate_templates 
SET 
  badge_icon = CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.difficulty_levels dl 
      WHERE dl.id = certificate_templates.difficulty_level_id 
      AND dl.level_number = 1
    ) THEN 'star'
    WHEN EXISTS (
      SELECT 1 FROM public.difficulty_levels dl 
      WHERE dl.id = certificate_templates.difficulty_level_id 
      AND dl.level_number = 2
    ) THEN 'medal'
    WHEN EXISTS (
      SELECT 1 FROM public.difficulty_levels dl 
      WHERE dl.id = certificate_templates.difficulty_level_id 
      AND dl.level_number = 3
    ) THEN 'trophy'
    WHEN EXISTS (
      SELECT 1 FROM public.difficulty_levels dl 
      WHERE dl.id = certificate_templates.difficulty_level_id 
      AND dl.level_number = 4
    ) THEN 'crown'
    ELSE 'gem'
  END,
  badge_color = certificate_border_color,
  badge_background_color = '#ffffff';