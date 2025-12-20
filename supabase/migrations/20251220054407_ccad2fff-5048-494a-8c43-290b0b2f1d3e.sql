-- Créer une table pour les privilèges globaux des administrateurs
CREATE TABLE public.admin_privileges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  privilege_key text NOT NULL UNIQUE,
  privilege_label text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.admin_privileges ENABLE ROW LEVEL SECURITY;

-- Policy pour la lecture : tous les admins peuvent lire
CREATE POLICY "Admins can view privileges"
ON public.admin_privileges
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE administrators.user_id = auth.uid()
  )
);

-- Policy pour la modification : seulement les super admins
CREATE POLICY "Super admins can manage privileges"
ON public.admin_privileges
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE administrators.user_id = auth.uid() 
    AND COALESCE(administrators.is_super_admin, false) = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE administrators.user_id = auth.uid() 
    AND COALESCE(administrators.is_super_admin, false) = true
  )
);

-- Accorder les privilèges au rôle authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_privileges TO authenticated;

-- Insérer les privilèges par défaut
INSERT INTO public.admin_privileges (privilege_key, privilege_label, is_enabled, description) VALUES
  ('manage_questions', 'Gérer les questions', false, 'Permet aux administrateurs de créer, modifier et supprimer des questions'),
  ('manage_homepage', 'Gérer la page d''accueil', false, 'Permet aux administrateurs de modifier le contenu de la page d''accueil'),
  ('manage_levels', 'Gérer les niveaux et certifications', false, 'Permet aux administrateurs de configurer les niveaux de difficulté et les certificats'),
  ('manage_planning', 'Gérer la planification', false, 'Permet aux administrateurs de créer et modifier les objectifs de planification'),
  ('manage_test_settings', 'Gérer les paramètres de test', false, 'Permet aux administrateurs de configurer les paramètres des tests'),
  ('view_finance', 'Voir les finances', false, 'Permet aux administrateurs d''accéder aux statistiques financières');

-- Trigger pour mise à jour automatique de updated_at
CREATE TRIGGER update_admin_privileges_updated_at
BEFORE UPDATE ON public.admin_privileges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();