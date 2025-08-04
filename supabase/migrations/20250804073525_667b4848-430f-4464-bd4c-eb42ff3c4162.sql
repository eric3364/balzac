-- Fix security issues

-- Fix function search path
CREATE OR REPLACE FUNCTION public.get_user_max_level(user_uuid UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(MAX(level), 0)
  FROM public.user_certifications
  WHERE user_id = user_uuid;
$$;

-- Add missing RLS policies for tables without policies
-- (Check if any tables need additional policies)