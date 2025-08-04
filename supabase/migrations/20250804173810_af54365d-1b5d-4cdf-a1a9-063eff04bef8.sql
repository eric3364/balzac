-- Marquer Eric Combalbert comme utilisateur confirmé
-- Mise à jour de l'utilisateur existant pour confirmer son email

UPDATE auth.users 
SET 
  email_confirmed_at = now(),
  email_change_confirm_status = 0,
  confirmation_token = '',
  recovery_token = ''
WHERE email = 'eric.combalbert@escen.fr';