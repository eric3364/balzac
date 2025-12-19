-- Ajouter la colonne ville à la table planning_objectives
ALTER TABLE public.planning_objectives
ADD COLUMN city text NULL;