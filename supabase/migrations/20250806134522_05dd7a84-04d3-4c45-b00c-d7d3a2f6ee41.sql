-- Supprimer toutes les progressions de session pour forcer le recalcul avec les nouveaux paramètres
DELETE FROM public.session_progress WHERE level = 1;