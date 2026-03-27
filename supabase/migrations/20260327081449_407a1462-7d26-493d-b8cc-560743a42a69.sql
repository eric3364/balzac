
-- Fix mutable search_path on functions flagged by the linter
ALTER FUNCTION public.generate_temporary_access_code() SET search_path = public;
ALTER FUNCTION public.calculate_total_sessions_for_level(integer, integer) SET search_path = public;
ALTER FUNCTION public.can_resend(text, inet, integer) SET search_path = public;
