-- Phase 1: Critical RLS Policy Reconstruction
-- First, drop all existing conflicting policies
DROP POLICY IF EXISTS "Allow select" ON public.questions;
DROP POLICY IF EXISTS "Allow insert" ON public.questions;
DROP POLICY IF EXISTS "Allow update" ON public.questions;
DROP POLICY IF EXISTS "Allow delete" ON public.questions;
DROP POLICY IF EXISTS "Allow all select" ON public.questions;
DROP POLICY IF EXISTS "Allow all insert" ON public.questions;
DROP POLICY IF EXISTS "Allow all update" ON public.questions;
DROP POLICY IF EXISTS "Allow all delete" ON public.questions;
DROP POLICY IF EXISTS "permissive" ON public.test_answers;
DROP POLICY IF EXISTS "all access" ON public.test_answers;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.test_sessions;
DROP POLICY IF EXISTS "all access" ON public.test_sessions;

-- Enable RLS on profiles table (currently disabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Fix the is_super_admin function to work with actual table structure
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN COALESCE((
        SELECT a.is_super_admin 
        FROM public.administrators a
        WHERE a.user_id = auth.uid()
    ), FALSE);
END;
$$;

-- Create proper RLS policies for questions table
CREATE POLICY "Authenticated users can select questions" 
ON public.questions 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage questions" 
ON public.questions 
FOR ALL 
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Create proper RLS policies for users table
CREATE POLICY "Users can view their own data" 
ON public.users 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own data" 
ON public.users 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own data" 
ON public.users 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create proper RLS policies for profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (id = auth.uid());

-- Create proper RLS policies for test_answers table
CREATE POLICY "Users can view their own test answers" 
ON public.test_answers 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own test answers" 
ON public.test_answers 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own test answers" 
ON public.test_answers 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create proper RLS policies for test_sessions table
CREATE POLICY "Users can view their own test sessions" 
ON public.test_sessions 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own test sessions" 
ON public.test_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own test sessions" 
ON public.test_sessions 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Fix the handle_new_user function to properly create profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 
             CONCAT(NEW.raw_user_meta_data ->> 'first_name', ' ', NEW.raw_user_meta_data ->> 'last_name'))
  );
  
  -- Insert into users table with proper data
  INSERT INTO public.users (user_id, email, first_name, last_name, school, class_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'school',
    NEW.raw_user_meta_data ->> 'class_name'
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();