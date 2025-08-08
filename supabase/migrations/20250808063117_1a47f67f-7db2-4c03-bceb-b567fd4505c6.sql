-- Ajouter des champs pour les descriptions personnalisées des certifications
ALTER TABLE public.certificate_templates 
ADD COLUMN IF NOT EXISTS feature_1_text TEXT,
ADD COLUMN IF NOT EXISTS feature_2_text TEXT,
ADD COLUMN IF NOT EXISTS feature_3_text TEXT;

-- Remplir avec les valeurs par défaut pour les certifications existantes
UPDATE public.certificate_templates 
SET 
  feature_1_text = CASE 
    WHEN price_euros = 0 THEN 'Accès complet gratuit'
    ELSE free_sessions || ' sessions d''essai'
  END,
  feature_2_text = CASE 
    WHEN price_euros = 0 THEN 'Certification incluse'
    ELSE 'Accès complet après achat'
  END,
  feature_3_text = CASE 
    WHEN price_euros = 0 THEN 'Idéal pour débuter'
    ELSE 'Certification officielle'
  END
WHERE feature_1_text IS NULL;