-- Ajouter le lien des mentions légales dans le footer
INSERT INTO public.footer_links (label, url, is_active, is_legal, sort_order)
VALUES ('Mentions légales', '/legal/mentions-legales', true, true, 1)
ON CONFLICT DO NOTHING;