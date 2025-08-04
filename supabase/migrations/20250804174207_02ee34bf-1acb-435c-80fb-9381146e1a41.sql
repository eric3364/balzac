-- Réinitialiser le mot de passe d'Eric Combalbert à un mot de passe connu
UPDATE auth.users 
SET encrypted_password = crypt('123456', gen_salt('bf'))
WHERE email = 'eric.combalbert@escen.fr';