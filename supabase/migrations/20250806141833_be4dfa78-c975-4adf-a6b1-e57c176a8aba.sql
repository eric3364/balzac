-- Corriger le type de question_id dans test_answers pour correspondre à la table questions
-- La table questions utilise bigint, pas uuid

ALTER TABLE test_answers ALTER COLUMN question_id TYPE bigint USING question_id::bigint;