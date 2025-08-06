-- Modification de la table test_sessions pour supporter les sessions progressives
ALTER TABLE public.test_sessions 
ADD COLUMN session_number DECIMAL(3,1) DEFAULT 1.0,
ADD COLUMN session_type TEXT DEFAULT 'regular' CHECK (session_type IN ('regular', 'remedial')),
ADD COLUMN required_score_percentage INTEGER DEFAULT 75,
ADD COLUMN is_session_validated BOOLEAN DEFAULT FALSE;

-- Table pour tracker les questions échouées par utilisateur/niveau
CREATE TABLE public.failed_questions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    question_id BIGINT NOT NULL,
    level INTEGER NOT NULL,
    failed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_remediated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, question_id, level)
);

-- Activer RLS pour la nouvelle table
ALTER TABLE public.failed_questions ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour failed_questions
CREATE POLICY "Users can manage their own failed questions" 
ON public.failed_questions 
FOR ALL 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- Table pour tracker la progression des sessions par niveau
CREATE TABLE public.session_progress (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    level INTEGER NOT NULL,
    current_session_number DECIMAL(3,1) DEFAULT 1.0,
    total_sessions_for_level INTEGER DEFAULT 5,
    completed_sessions INTEGER DEFAULT 0,
    is_level_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, level)
);

-- Activer RLS pour session_progress
ALTER TABLE public.session_progress ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour session_progress
CREATE POLICY "Users can manage their own session progress" 
ON public.session_progress 
FOR ALL 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- Fonction pour calculer le nombre total de sessions pour un niveau
CREATE OR REPLACE FUNCTION public.calculate_total_sessions_for_level(
    level_num INTEGER,
    questions_percentage INTEGER DEFAULT 20
)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT CEIL(
        (SELECT COUNT(*) FROM public.questions WHERE level = level_num)::DECIMAL / 
        (questions_percentage::DECIMAL / 100)
    )::INTEGER;
$$;

-- Fonction pour obtenir les questions d'une session spécifique
CREATE OR REPLACE FUNCTION public.get_session_questions(
    user_uuid UUID,
    level_num INTEGER,
    session_num DECIMAL(3,1),
    questions_percentage INTEGER DEFAULT 20
)
RETURNS TABLE(
    id BIGINT,
    content TEXT,
    type TEXT,
    level INTEGER,
    rule TEXT,
    answer TEXT,
    choices TEXT[],
    explanation TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    questions_per_session INTEGER;
    session_index INTEGER;
    offset_value INTEGER;
BEGIN
    -- Calculer le nombre de questions par session
    SELECT (COUNT(*) * questions_percentage / 100)::INTEGER
    INTO questions_per_session
    FROM public.questions 
    WHERE questions.level = level_num;
    
    -- Calculer l'offset basé sur le numéro de session
    session_index := (session_num - FLOOR(session_num)) * 10;
    IF session_index = 0 THEN session_index := 10; END IF;
    offset_value := (session_index - 1) * questions_per_session;
    
    -- Si c'est une session de rattrapage (session_num > 10), retourner les questions échouées
    IF session_num > 10 THEN
        RETURN QUERY
        SELECT q.id, q.content, q.type, q.level, q.rule, q.answer, q.choices, q.explanation
        FROM public.questions q
        INNER JOIN public.failed_questions fq ON q.id = fq.question_id
        WHERE fq.user_id = user_uuid 
        AND q.level = level_num 
        AND fq.is_remediated = FALSE
        ORDER BY q.id;
    ELSE
        -- Session normale
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