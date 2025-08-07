-- Nettoyer les politiques en double sur site_configuration
DROP POLICY IF EXISTS "Admins can view site configuration" ON public.site_configuration;
DROP POLICY IF EXISTS "Admins can insert site configuration" ON public.site_configuration;
DROP POLICY IF EXISTS "Admins can update site configuration" ON public.site_configuration;
DROP POLICY IF EXISTS "Admins can delete site configuration" ON public.site_configuration;
DROP POLICY IF EXISTS "Super admins can manage site configuration" ON public.site_configuration;

-- Nettoyer les politiques en double sur difficulty_levels
DROP POLICY IF EXISTS "Public can view active difficulty levels" ON public.difficulty_levels;

-- Garder seulement les politiques is_super_admin() pour la configuration
-- Elles sont déjà créées et fonctionnent correctement

-- Test rapide pour vérifier que l'utilisateur actuel est super admin
SELECT auth.uid() as current_user_id, is_super_admin() as is_super_admin;