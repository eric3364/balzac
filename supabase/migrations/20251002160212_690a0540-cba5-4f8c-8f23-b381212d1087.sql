-- Mettre à jour la fonction get_session_questions pour utiliser le nom de niveau au lieu du numéro
DROP FUNCTION IF EXISTS public.get_session_questions(uuid, integer, numeric, integer);

CREATE OR REPLACE FUNCTION public.get_session_questions(
  user_uuid uuid, 
  level_num integer, 
  session_num numeric, 
  questions_percentage integer DEFAULT 20
)
RETURNS TABLE(
  id bigint, 
  content text, 
  type text, 
  level text,  -- Changé de integer à text
  rule text, 
  answer text, 
  choices text[], 
  explanation text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    questions_per_session INTEGER;
    session_index INTEGER;
    offset_value INTEGER;
    level_name TEXT;
BEGIN
    -- Convertir le numéro de niveau en nom de niveau
    CASE level_num
        WHEN 1 THEN level_name := 'élémentaire';
        WHEN 2 THEN level_name := 'intermédiaire';
        WHEN 3 THEN level_name := 'avancé';
        ELSE level_name := 'élémentaire';
    END CASE;

    -- Si c'est une session de rattrapage (session_num >= 99), retourner TOUTES les questions échouées
    IF session_num >= 99 THEN
        RETURN QUERY
        SELECT q.id, q.content, q.type, q.level, q.rule, q.answer, q.choices, q.explanation
        FROM public.questions q
        INNER JOIN public.failed_questions fq ON q.id = fq.question_id
        WHERE fq.user_id = user_uuid 
        AND fq.level = level_num  -- La table failed_questions utilise des nombres
        AND fq.is_remediated = FALSE
        ORDER BY q.id;
    ELSE
        -- Session normale - calculer le nombre de questions par session
        SELECT (COUNT(*) * questions_percentage / 100)::INTEGER
        INTO questions_per_session
        FROM public.questions 
        WHERE questions.level = level_name;
        
        -- Calculer l'offset basé sur le numéro de session
        offset_value := (session_num - 1) * questions_per_session;
        
        -- Retourner les questions pour la session normale
        RETURN QUERY
        SELECT q.id, q.content, q.type, q.level, q.rule, q.answer, q.choices, q.explanation
        FROM public.questions q
        WHERE q.level = level_name
        ORDER BY q.id
        LIMIT questions_per_session
        OFFSET offset_value;
    END IF;
END;
$function$;