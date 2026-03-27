-- Create a safe function to get questions without answers
CREATE OR REPLACE FUNCTION public.get_questions_safe(level_filter text DEFAULT NULL)
  RETURNS TABLE(
    id bigint,
    content text,
    type text,
    level text,
    rule text,
    choices text[],
    explanation text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT q.id, q.content, q.type, q.level, q.rule, q.choices, q.explanation
  FROM public.questions q
  WHERE (level_filter IS NULL OR q.level = level_filter)
  ORDER BY q.id;
$$;

-- Create a function to count questions by level
CREATE OR REPLACE FUNCTION public.count_questions_by_level(level_filter text)
  RETURNS bigint
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.questions
  WHERE level = level_filter;
$$;