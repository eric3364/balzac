-- Vérifier si le bucket custom-badges existe, sinon le créer
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-badges', 'custom-badges', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques RLS pour le bucket custom-badges
-- Permettre à tous de voir les badges (publics)
CREATE POLICY "Public can view custom badges"
ON storage.objects
FOR SELECT
USING (bucket_id = 'custom-badges');

-- Permettre aux super admins de télécharger des badges
CREATE POLICY "Super admins can upload custom badges"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'custom-badges' AND is_super_admin());

-- Permettre aux super admins de mettre à jour des badges
CREATE POLICY "Super admins can update custom badges"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'custom-badges' AND is_super_admin());

-- Permettre aux super admins de supprimer des badges
CREATE POLICY "Super admins can delete custom badges"
ON storage.objects
FOR DELETE
USING (bucket_id = 'custom-badges' AND is_super_admin());