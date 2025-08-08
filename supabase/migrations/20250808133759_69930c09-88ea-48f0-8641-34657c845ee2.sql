-- Add discount_percentage column to promo_codes table
ALTER TABLE public.promo_codes 
ADD COLUMN discount_percentage INTEGER NOT NULL DEFAULT 100;

-- Add a comment to explain the column
COMMENT ON COLUMN public.promo_codes.discount_percentage IS 'Percentage of discount (0-100). 100 = free access, 50 = 50% discount, etc.';