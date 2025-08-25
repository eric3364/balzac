-- Fix remaining database functions with proper search_path
CREATE OR REPLACE FUNCTION public.generate_temporary_access_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  code TEXT;
BEGIN
  -- Générer un code de 8 caractères alphanumériques
  code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 8));
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_access_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Générer un code d'accès temporaire si le statut est 'completed' et qu'il n'y en a pas déjà un
  IF NEW.status = 'completed' AND NEW.temporary_access_code IS NULL THEN
    NEW.temporary_access_code := generate_temporary_access_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_total_sessions_for_level(level_num integer, questions_percentage integer DEFAULT 20)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
    SELECT CEIL(
        (SELECT COUNT(*) FROM public.questions WHERE level = level_num)::DECIMAL / 
        (questions_percentage::DECIMAL / 100)
    )::INTEGER;
$$;

CREATE OR REPLACE FUNCTION public.get_session_questions(user_uuid uuid, level_num integer, session_num numeric, questions_percentage integer DEFAULT 20)
RETURNS TABLE(id bigint, content text, type text, level integer, rule text, answer text, choices text[], explanation text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_free_sessions_for_level(level_num integer)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT COALESCE(ct.free_sessions, 3)
  FROM public.certificate_templates ct
  INNER JOIN public.difficulty_levels dl ON ct.difficulty_level_id = dl.id
  WHERE dl.level_number = level_num 
  AND ct.is_active = true
  LIMIT 1;
$$;