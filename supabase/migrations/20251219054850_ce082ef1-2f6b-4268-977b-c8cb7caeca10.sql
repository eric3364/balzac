-- Ajouter la colonne ville à la table users
ALTER TABLE public.users 
ADD COLUMN city text;

-- Créer un type enum pour les villes (optionnel mais recommandé pour la cohérence)
-- On garde text pour plus de flexibilité

-- Mettre à jour la fonction handle_new_user pour inclure la ville
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 
             CONCAT(NEW.raw_user_meta_data ->> 'first_name', ' ', NEW.raw_user_meta_data ->> 'last_name'))
  );
  
  INSERT INTO public.users (user_id, email, first_name, last_name, school, class_name, city)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'school',
    NEW.raw_user_meta_data ->> 'class_name',
    NEW.raw_user_meta_data ->> 'city'
  );
  
  RETURN NEW;
END;
$$;