-- Insérer Eric Combalbert comme super administrateur
INSERT INTO public.administrators (email, is_super_admin, user_id)
VALUES ('eric.combalbert@escen.fr', true, null)
ON CONFLICT (email) DO UPDATE SET
  is_super_admin = true;

-- Note: user_id sera null jusqu'à ce qu'Eric se connecte avec ce compte