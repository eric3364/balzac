-- Ajouter la colonne reference_admin_id à la table planning_objectives
ALTER TABLE public.planning_objectives 
ADD COLUMN reference_admin_id uuid REFERENCES public.administrators(user_id);

-- Créer un index pour améliorer les performances
CREATE INDEX idx_planning_objectives_reference_admin ON public.planning_objectives(reference_admin_id);