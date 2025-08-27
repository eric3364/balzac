-- Vérifier et ajouter l'utilisateur actuel comme super admin
INSERT INTO public.administrators (user_id, is_super_admin, email)
VALUES (
  'e4bdb8cd-31af-4a49-b008-579f228ddd76'::uuid,
  true,
  'eric.combalbert@escen.fr'
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  is_super_admin = true,
  email = EXCLUDED.email;