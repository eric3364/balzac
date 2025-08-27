-- Ajouter la colonne choices manquante à la table questions
ALTER TABLE public.questions 
ADD COLUMN choices text[] DEFAULT NULL;