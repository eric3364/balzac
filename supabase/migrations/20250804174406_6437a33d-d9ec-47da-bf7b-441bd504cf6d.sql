-- Vérifier et insérer Eric Combalbert comme super administrateur
-- S'assurer qu'il est dans la table administrators avec les bons droits

INSERT INTO public.administrators (
  user_id,
  email,
  is_super_admin
) VALUES (
  'e4bdb8cd-31af-4a49-b008-579f228ddd76',
  'eric.combalbert@escen.fr',
  true
) ON CONFLICT (user_id) DO UPDATE SET
  is_super_admin = true,
  email = EXCLUDED.email;