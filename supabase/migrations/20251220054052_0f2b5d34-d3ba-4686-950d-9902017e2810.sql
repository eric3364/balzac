-- Accorder les privilèges de base sur la table questions au rôle authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;

-- S'assurer que la séquence de l'ID est également accessible
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;