-- Corriger la clé primaire incorrecte de test_answers
-- La clé primaire doit être sur id, pas sur user_id

-- Supprimer l'ancienne clé primaire incorrecte
ALTER TABLE public.test_answers DROP CONSTRAINT IF EXISTS test_answers_pkey;

-- Ajouter la bonne clé primaire sur la colonne id
ALTER TABLE public.test_answers ADD CONSTRAINT test_answers_pkey PRIMARY KEY (id);