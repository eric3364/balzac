-- Create footer_social_links table
CREATE TABLE public.footer_social_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  icon text NOT NULL DEFAULT 'link',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create footer_links table  
CREATE TABLE public.footer_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_legal boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.footer_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footer_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for footer_social_links
CREATE POLICY "Public can view active social links" 
ON public.footer_social_links 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Super admins can manage social links" 
ON public.footer_social_links 
FOR ALL 
USING (is_super_admin()) 
WITH CHECK (is_super_admin());

-- RLS policies for footer_links
CREATE POLICY "Public can view active footer links" 
ON public.footer_links 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Super admins can manage footer links" 
ON public.footer_links 
FOR ALL 
USING (is_super_admin()) 
WITH CHECK (is_super_admin());

-- Add triggers for updated_at
CREATE TRIGGER update_footer_social_links_updated_at
BEFORE UPDATE ON public.footer_social_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_footer_links_updated_at
BEFORE UPDATE ON public.footer_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add missing columns to footer_settings if they don't exist
ALTER TABLE public.footer_settings 
ADD COLUMN IF NOT EXISTS company_address text,
ADD COLUMN IF NOT EXISTS company_email text,
ADD COLUMN IF NOT EXISTS company_phone text,
ADD COLUMN IF NOT EXISTS cookie_management_url text;