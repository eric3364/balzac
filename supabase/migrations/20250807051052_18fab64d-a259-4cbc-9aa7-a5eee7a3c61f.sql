-- Créer les certifications manquantes pour les niveaux déjà complétés
-- Cette fonction vérifie les progressions complétées et crée les certifications manquantes
INSERT INTO public.user_certifications (user_id, level, score, certified_at)
SELECT DISTINCT
    sp.user_id,
    sp.level,
    COALESCE(
        -- Prendre le score de la session de rattrapage si elle existe
        (SELECT ts.score 
         FROM test_sessions ts 
         WHERE ts.user_id = sp.user_id 
         AND ts.level = sp.level 
         AND ts.session_type = 'remedial' 
         AND ts.is_session_validated = true 
         ORDER BY ts.ended_at DESC 
         LIMIT 1),
        -- Sinon prendre le score moyen des sessions régulières
        (SELECT ROUND(AVG(ts.score)) 
         FROM test_sessions ts 
         WHERE ts.user_id = sp.user_id 
         AND ts.level = sp.level 
         AND ts.session_type = 'regular' 
         AND ts.is_session_validated = true)
    ) as score,
    NOW() as certified_at
FROM session_progress sp
WHERE sp.is_level_completed = true
AND NOT EXISTS (
    SELECT 1 
    FROM user_certifications uc 
    WHERE uc.user_id = sp.user_id 
    AND uc.level = sp.level
);