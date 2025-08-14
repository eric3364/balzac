-- Add DELETE policy for promo_codes table
CREATE POLICY "Only admins can delete promo codes" ON public.promo_codes
FOR DELETE
USING (is_super_admin());