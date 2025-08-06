-- Ajouter une contrainte unique pour éviter les doublons de réponses
-- Supprimer d'abord toute contrainte existante si elle existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'test_answers_unique_response' 
               AND table_name = 'test_answers') THEN
        ALTER TABLE public.test_answers DROP CONSTRAINT test_answers_unique_response;
    END IF;
END
$$;

-- Créer une contrainte unique sur user_id, session_id, question_id
ALTER TABLE public.test_answers 
ADD CONSTRAINT test_answers_unique_response 
UNIQUE (user_id, session_id, question_id);