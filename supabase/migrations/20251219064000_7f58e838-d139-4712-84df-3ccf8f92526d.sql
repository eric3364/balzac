-- Permettre la valeur NULL pour la colonne school
ALTER TABLE public.planning_objectives 
ALTER COLUMN school DROP NOT NULL;