-- Ajouter une contrainte unique sur user_id et question_id pour permettre l'upsert
ALTER TABLE question_attempts 
ADD CONSTRAINT question_attempts_user_question_unique 
UNIQUE (user_id, question_id);