-- Modifier la fonction get_session_questions pour inclure TOUTES les questions échouées dans les sessions de rattrapage
CREATE OR REPLACE FUNCTION public.get_session_questions(user_uuid uuid, level_num integer, session_num numeric, questions_percentage integer DEFAULT 20)
 RETURNS TABLE(id bigint, content text, type text, level integer, rule text, answer text, choices text[], explanation text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    questions_per_session INTEGER;
    session_index INTEGER;
    offset_value INTEGER;
BEGIN
    -- Si c'est une session de rattrapage (session_num >= 99), retourner TOUTES les questions échouées
    IF session_num >= 99 THEN
        RETURN QUERY
        SELECT q.id, q.content, q.type, q.level, q.rule, q.answer, q.choices, q.explanation
        FROM public.questions q
        INNER JOIN public.failed_questions fq ON q.id = fq.question_id
        WHERE fq.user_id = user_uuid 
        AND q.level = level_num 
        AND fq.is_remediated = FALSE
        ORDER BY q.id;
    ELSE
        -- Session normale - calculer le nombre de questions par session
        SELECT (COUNT(*) * questions_percentage / 100)::INTEGER
        INTO questions_per_session
        FROM public.questions 
        WHERE questions.level = level_num;
        
        -- Calculer l'offset basé sur le numéro de session (numérotation simplifiée)
        offset_value := (session_num - 1) * questions_per_session;
        
        -- Retourner les questions pour la session normale
        RETURN QUERY
        SELECT q.id, q.content, q.type, q.level, q.rule, q.answer, q.choices, q.explanation
        FROM public.questions q
        WHERE q.level = level_num
        ORDER BY q.id
        LIMIT questions_per_session
        OFFSET offset_value;
    END IF;
END;
$function$