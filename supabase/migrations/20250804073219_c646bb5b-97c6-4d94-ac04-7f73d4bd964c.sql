-- Fix test_sessions table and add certification system

-- Add primary key to test_sessions table
ALTER TABLE public.test_sessions 
ADD CONSTRAINT test_sessions_pkey PRIMARY KEY (id);

-- Add level-based certification tracking
CREATE TABLE IF NOT EXISTS public.user_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  certified_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  score INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, level)
);

-- Add question attempts tracking for incorrect answers
CREATE TABLE IF NOT EXISTS public.question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES public.questions(id),
  level INTEGER NOT NULL,
  session_id UUID REFERENCES public.test_sessions(id),
  attempts_count INTEGER DEFAULT 1,
  is_correct BOOLEAN DEFAULT false,
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, question_id, level)
);

-- Add test batches to track question sets
CREATE TABLE IF NOT EXISTS public.test_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.test_sessions(id),
  batch_number INTEGER NOT NULL,
  level INTEGER NOT NULL,
  questions_count INTEGER DEFAULT 30,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Modify test_sessions to include current level and batch info
ALTER TABLE public.test_sessions 
ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_batch INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS questions_mastered INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS certification_target BOOLEAN DEFAULT false;

-- Add explanations to questions for incorrect answers
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS explanation TEXT;

-- Enable RLS on new tables
ALTER TABLE public.user_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_certifications
CREATE POLICY "Users can view their own certifications" 
ON public.user_certifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own certifications" 
ON public.user_certifications 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- RLS policies for question_attempts
CREATE POLICY "Users can view their own question attempts" 
ON public.question_attempts 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own question attempts" 
ON public.question_attempts 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS policies for test_batches
CREATE POLICY "Users can view their own test batches" 
ON public.test_batches 
FOR SELECT 
USING (session_id IN (SELECT id FROM test_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own test batches" 
ON public.test_batches 
FOR INSERT 
WITH CHECK (session_id IN (SELECT id FROM test_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own test batches" 
ON public.test_batches 
FOR UPDATE 
USING (session_id IN (SELECT id FROM test_sessions WHERE user_id = auth.uid()));

-- Function to get user's highest certified level
CREATE OR REPLACE FUNCTION public.get_user_max_level(user_uuid UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(MAX(level), 0)
  FROM public.user_certifications
  WHERE user_id = user_uuid;
$$;