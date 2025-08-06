-- Nettoyer les données existantes pour la nouvelle numérotation simplifiée
-- Supprimer tous les enregistrements de session_progress et test_sessions pour recommencer avec la nouvelle numérotation

DELETE FROM test_sessions;
DELETE FROM session_progress;

-- Note: Les utilisateurs devront recommencer leurs progressions avec la nouvelle numérotation simplifiée (1, 2, 3, etc.)