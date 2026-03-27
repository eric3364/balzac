
-- Fix remaining mutable search_path functions (overloaded versions)
ALTER FUNCTION public.can_resend(text) SET search_path = public;
ALTER FUNCTION public.write_resend_log(text) SET search_path = public;
