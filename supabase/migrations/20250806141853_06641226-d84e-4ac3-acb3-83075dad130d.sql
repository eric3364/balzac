-- Corriger le type de question_id dans test_answers
-- Supprimer et recréer la colonne avec le bon type

-- D'abord, supprimer la colonne question_id
ALTER TABLE test_answers DROP COLUMN question_id;

-- Recréer la colonne avec le bon type (bigint comme dans questions)
ALTER TABLE test_answers ADD COLUMN question_id bigint;