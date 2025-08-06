-- Corriger la structure de la table test_sessions
-- Supprimer la contrainte de clé primaire incorrecte et ajouter la bonne structure

-- D'abord, supprimer la contrainte de clé primaire actuelle
ALTER TABLE test_sessions DROP CONSTRAINT test_sessions_pkey;

-- Ajouter la clé primaire sur l'id
ALTER TABLE test_sessions ADD CONSTRAINT test_sessions_pkey PRIMARY KEY (id);

-- Ajouter une contrainte unique sur la combinaison qui identifie une session unique
ALTER TABLE test_sessions ADD CONSTRAINT test_sessions_unique_session 
UNIQUE (user_id, level, session_number, session_type);