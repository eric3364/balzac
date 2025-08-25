-- Fix security vulnerability: Restrict promo code access to admins only
-- Remove the public access policy and replace with admin-only access

-- Drop the existing public access policy
DROP POLICY IF EXISTS "Promo codes are viewable by everyone" ON public.promo_codes;

-- Create new admin-only access policy for viewing promo codes
CREATE POLICY "Only admins can view promo codes" 
ON public.promo_codes 
FOR SELECT 
USING (is_super_admin());

-- Ensure the existing security definer functions can still access promo codes
-- The validate_promo_code and apply_promo_code functions are already SECURITY DEFINER
-- so they will continue to work for authenticated users

-- Add a comment to document the security fix
COMMENT ON TABLE public.promo_codes IS 'Promo codes table - access restricted to admins only for security. Users interact via secure functions only.';