-- Créer directement l'utilisateur Eric Combalbert avec email confirmé
-- Utilisation de la fonction admin pour créer l'utilisateur

-- D'abord, insérer dans la table profiles
INSERT INTO public.profiles (
  id,
  full_name
) VALUES (
  'e4bdb8cd-31af-4a49-b008-579f228ddd76',
  'Eric Combalbert'
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name;

-- Ensuite, insérer dans la table users
INSERT INTO public.users (
  user_id,
  email,
  first_name,
  last_name,
  school,
  class_name
) VALUES (
  'e4bdb8cd-31af-4a49-b008-579f228ddd76',
  'eric.combalbert@escen.fr',
  'Eric',
  'Combalbert',
  'ESCEN',
  'Administration'
) ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;