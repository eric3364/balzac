-- Insérer Eric Combalbert comme utilisateur confirmé avec mot de passe temporaire
-- Note: L'utilisateur devra changer ce mot de passe lors de sa première connexion

-- Insérer dans auth.users (simulation de la validation d'email)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_new,
  recovery_token
) VALUES (
  'e4bdb8cd-31af-4a49-b008-579f228ddd76',
  '00000000-0000-0000-0000-000000000000',
  'eric.combalbert@escen.fr',
  crypt('MotDePasseTemporaire123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  ''
) ON CONFLICT (email) DO UPDATE SET
  email_confirmed_at = now(),
  updated_at = now();

-- Insérer dans auth.identities
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  created_at,
  updated_at
) VALUES (
  'e4bdb8cd-31af-4a49-b008-579f228ddd76',
  'e4bdb8cd-31af-4a49-b008-579f228ddd76',
  jsonb_build_object(
    'sub', 'e4bdb8cd-31af-4a49-b008-579f228ddd76',
    'email', 'eric.combalbert@escen.fr'
  ),
  'email',
  now(),
  now()
) ON CONFLICT (provider, id) DO NOTHING;