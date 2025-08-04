-- Clean up remaining issues
-- Remove leftover permissive policy
DROP POLICY IF EXISTS "permissive" ON public.test_answers;

-- Enable RLS on users table (seems to be missing)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;