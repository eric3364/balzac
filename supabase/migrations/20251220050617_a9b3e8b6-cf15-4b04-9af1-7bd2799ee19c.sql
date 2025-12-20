-- Table pour stocker les valeurs de référence personnalisées (écoles, classes, villes)
CREATE TABLE public.reference_values (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('school', 'class_name', 'city')),
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(type, value)
);

-- Enable RLS
ALTER TABLE public.reference_values ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view reference values"
ON public.reference_values
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage reference values"
ON public.reference_values
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Index pour améliorer les performances
CREATE INDEX idx_reference_values_type ON public.reference_values(type);