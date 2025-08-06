-- Corriger la colonne deleted_at pour qu'elle soit NULL par défaut
-- et ne pas marquer automatiquement les sessions comme supprimées
ALTER TABLE public.test_sessions 
ALTER COLUMN deleted_at DROP DEFAULT,
ALTER COLUMN deleted_at SET DEFAULT NULL;

-- Nettoyer les sessions existantes qui ont été marquées comme supprimées par erreur
-- mais qui sont en fait complétées
UPDATE public.test_sessions 
SET deleted_at = NULL 
WHERE status = 'completed' 
AND deleted_at IS NOT NULL;