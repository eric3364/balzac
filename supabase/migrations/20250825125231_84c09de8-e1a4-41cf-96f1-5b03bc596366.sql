-- Create footer settings table
CREATE TABLE public.footer_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  copyright_text TEXT NOT NULL DEFAULT '© 2025 NEXT-U – Tous droits réservés.',
  company_address TEXT,
  company_email TEXT,
  company_phone TEXT,
  cookie_management_url TEXT DEFAULT '#',
  legal_link_enabled BOOLEAN NOT NULL DEFAULT true,
  legal_link_label TEXT NOT NULL DEFAULT 'Mentions légales',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create social media links table
CREATE TABLE public.footer_social_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create footer links table
CREATE TABLE public.footer_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_legal BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create legal pages table
CREATE TABLE public.legal_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.footer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footer_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

-- Footer settings policies
CREATE POLICY "Public can view footer settings" ON public.footer_settings
FOR SELECT USING (true);

CREATE POLICY "Super admins can manage footer settings" ON public.footer_settings
FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Social links policies
CREATE POLICY "Public can view active social links" ON public.footer_social_links
FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can manage social links" ON public.footer_social_links
FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Footer links policies
CREATE POLICY "Public can view active footer links" ON public.footer_links
FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can manage footer links" ON public.footer_links
FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Legal pages policies
CREATE POLICY "Public can view published legal pages" ON public.legal_pages
FOR SELECT USING (status = 'published');

CREATE POLICY "Super admins can manage legal pages" ON public.legal_pages
FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Insert default footer settings
INSERT INTO public.footer_settings (copyright_text, company_address, company_email, company_phone) 
VALUES ('© 2025 NEXT-U – Tous droits réservés.', '', '', '');

-- Insert default legal pages
INSERT INTO public.legal_pages (title, slug, content, status) VALUES 
('Mentions légales', 'mentions-legales', 'Contenu des mentions légales à définir.', 'published'),
('Politique de confidentialité', 'politique-confidentialite', 'Contenu de la politique de confidentialité à définir.', 'published'),
('Conditions d''utilisation', 'conditions-utilisation', 'Contenu des conditions d''utilisation à définir.', 'published');

-- Create triggers for updated_at
CREATE TRIGGER update_footer_settings_updated_at
BEFORE UPDATE ON public.footer_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_footer_social_links_updated_at
BEFORE UPDATE ON public.footer_social_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_footer_links_updated_at
BEFORE UPDATE ON public.footer_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_pages_updated_at
BEFORE UPDATE ON public.legal_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();