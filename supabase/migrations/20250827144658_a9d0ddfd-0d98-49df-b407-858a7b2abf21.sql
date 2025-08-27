-- Create RLS policies for questions table to allow authenticated users to read questions
CREATE POLICY "Authenticated users can read questions" 
ON public.questions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for difficulty_levels table to allow authenticated users to read levels
CREATE POLICY "Authenticated users can read difficulty levels" 
ON public.difficulty_levels 
FOR SELECT 
USING (auth.uid() IS NOT NULL);