-- Create footer_settings table
CREATE TABLE public.footer_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  copyright_text TEXT NOT NULL DEFAULT '© 2025 NEXT-U – Tous droits réservés.',
  legal_link_label TEXT NOT NULL DEFAULT 'Mentions légales',
  legal_link_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create legal_page table  
CREATE TABLE public.legal_page (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Mentions légales',
  slug TEXT NOT NULL DEFAULT 'mentions-legales',
  content TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on slug
CREATE UNIQUE INDEX legal_page_slug_idx ON public.legal_page(slug);

-- Enable Row Level Security
ALTER TABLE public.footer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_page ENABLE ROW LEVEL SECURITY;

-- RLS Policies for footer_settings
CREATE POLICY "Super admins can manage footer settings" 
ON public.footer_settings 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Public can view footer settings" 
ON public.footer_settings 
FOR SELECT 
USING (true);

-- RLS Policies for legal_page
CREATE POLICY "Super admins can manage legal pages" 
ON public.legal_page 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Public can view published legal pages" 
ON public.legal_page 
FOR SELECT 
USING (status = 'published');

-- Insert default footer settings
INSERT INTO public.footer_settings (copyright_text, legal_link_label, legal_link_enabled)
VALUES ('© 2025 NEXT-U – Tous droits réservés.', 'Mentions légales', true);

-- Insert default legal page with template content
INSERT INTO public.legal_page (title, slug, content, status)
VALUES (
  'Mentions légales',
  'mentions-legales',
  E'# Mentions légales\n\n## Éditeur du site\n\n**Raison sociale :** [À compléter]\n**SIRET :** [À compléter]\n**TVA intracommunautaire :** [À compléter]\n**Siège social :** [Adresse à compléter]\n**Directeur de la publication :** [Nom à compléter]\n\n## Hébergement\n\n**Hébergeur :** [Nom de l\'hébergeur]\n**Adresse :** [Adresse de l\'hébergeur]\n**Téléphone :** [Téléphone de l\'hébergeur]\n\n## Propriété intellectuelle\n\nL\'ensemble de ce site relève de la législation française et internationale sur le droit d\'auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés.\n\n## Données personnelles\n\nConformément au RGPD, vous disposez d\'un droit d\'accès, de rectification et de suppression des données vous concernant.\n**Contact DPO :** [Email du DPO]\n\n## Cookies\n\nCe site utilise des cookies pour améliorer votre expérience de navigation. [Référence à la page cookies si applicable]\n\n## Responsabilité\n\nL\'éditeur ne pourra être tenu responsable des dommages directs et indirects causés au matériel de l\'utilisateur.\n\n## Loi applicable\n\nLe présent site est soumis au droit français.',
  'draft'
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_footer_settings_updated_at
BEFORE UPDATE ON public.footer_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_page_updated_at
BEFORE UPDATE ON public.legal_page
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();