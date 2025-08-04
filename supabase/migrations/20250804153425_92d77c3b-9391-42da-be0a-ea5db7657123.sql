-- Réinitialiser tous les tests et progressions des utilisateurs
-- Supprimer toutes les tentatives de questions
DELETE FROM public.question_attempts;

-- Supprimer toutes les réponses aux tests
DELETE FROM public.test_answers;

-- Supprimer tous les lots de tests
DELETE FROM public.test_batches;

-- Supprimer toutes les sessions de test
DELETE FROM public.test_sessions;

-- Supprimer toutes les certifications utilisateur
DELETE FROM public.user_certifications;

-- Remettre à zéro les compteurs de séquence si nécessaire
-- Les UUID sont générés automatiquement, pas besoin de réinitialiser