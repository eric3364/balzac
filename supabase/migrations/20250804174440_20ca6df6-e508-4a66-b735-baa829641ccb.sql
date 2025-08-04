-- Mettre à jour l'enregistrement administrateur existant d'Eric avec le bon user_id
UPDATE public.administrators 
SET user_id = 'e4bdb8cd-31af-4a49-b008-579f228ddd76',
    is_super_admin = true
WHERE email = 'eric.combalbert@escen.fr';