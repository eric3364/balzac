import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SCHOOLS, CLASS_LEVELS, CITIES } from '@/constants/userData';

export type ReferenceType = 'school' | 'class_name' | 'city';

interface ReferenceValue {
  id: string;
  type: ReferenceType;
  value: string;
  created_at: string;
}

export const useReferenceValues = () => {
  const [customValues, setCustomValues] = useState<ReferenceValue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomValues = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('reference_values')
        .select('*')
        .order('value');

      if (error) throw error;
      setCustomValues((data || []) as ReferenceValue[]);
    } catch (error) {
      console.error('Error fetching reference values:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomValues();
  }, [fetchCustomValues]);

  // Écouter les changements en temps réel
  useEffect(() => {
    const channel = supabase
      .channel('reference_values_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reference_values'
        },
        (payload) => {
          console.log('Reference values updated:', payload);
          // Refetch toutes les valeurs pour maintenir la cohérence
          fetchCustomValues();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCustomValues]);

  // Combiner les valeurs statiques avec les valeurs personnalisées
  const getAllSchools = useCallback((): string[] => {
    const staticSchools = [...SCHOOLS];
    const customSchools = customValues
      .filter(v => v.type === 'school')
      .map(v => v.value);
    return [...new Set([...staticSchools, ...customSchools])].sort();
  }, [customValues]);

  const getAllClasses = useCallback((): string[] => {
    const staticClasses = [...CLASS_LEVELS];
    const customClasses = customValues
      .filter(v => v.type === 'class_name')
      .map(v => v.value);
    return [...new Set([...staticClasses, ...customClasses])].sort();
  }, [customValues]);

  const getAllCities = useCallback((): string[] => {
    const staticCities = [...CITIES];
    const customCities = customValues
      .filter(v => v.type === 'city')
      .map(v => v.value);
    return [...new Set([...staticCities, ...customCities])].sort();
  }, [customValues]);

  // Ajouter une nouvelle valeur de référence
  const addReferenceValue = useCallback(async (type: ReferenceType, value: string): Promise<boolean> => {
    if (!value.trim()) return false;

    // Vérifier si la valeur existe déjà (statique ou personnalisée)
    const allValues = type === 'school' ? getAllSchools() 
      : type === 'class_name' ? getAllClasses() 
      : getAllCities();
    
    if (allValues.some(v => v.toLowerCase() === value.trim().toLowerCase())) {
      return true; // Déjà existante, pas besoin d'ajouter
    }

    try {
      const { error } = await supabase
        .from('reference_values')
        .insert({ type, value: value.trim() });

      if (error) {
        // Si c'est une erreur de doublon, c'est OK
        if (error.code === '23505') return true;
        throw error;
      }

      await fetchCustomValues();
      return true;
    } catch (error) {
      console.error('Error adding reference value:', error);
      return false;
    }
  }, [getAllSchools, getAllClasses, getAllCities, fetchCustomValues]);

  // Supprimer une valeur de référence personnalisée
  const removeReferenceValue = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('reference_values')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCustomValues();
      return true;
    } catch (error) {
      console.error('Error removing reference value:', error);
      return false;
    }
  }, [fetchCustomValues]);

  return {
    customValues,
    loading,
    getAllSchools,
    getAllClasses,
    getAllCities,
    addReferenceValue,
    removeReferenceValue,
    refetch: fetchCustomValues
  };
};
