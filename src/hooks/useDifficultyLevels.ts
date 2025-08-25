import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DifficultyLevel {
  level_number: number;
  name: string;
  color: string | null;
  description?: string | null;
}

export const useDifficultyLevels = () => {
  const [difficultyLevels, setDifficultyLevels] = useState<DifficultyLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDifficultyLevels = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('difficulty_levels')
        .select('*')
        .order('level_number', { ascending: true });

      if (error) throw error;

      setDifficultyLevels((data || []).map(level => ({
        ...level,
        color: level.color || '#6366f1'
      })));
    } catch (error) {
      console.error('Erreur lors du chargement des niveaux de difficulté:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDifficultyLevels();
  }, [loadDifficultyLevels]);

  return {
    difficultyLevels,
    loading,
    refetch: loadDifficultyLevels
  };
};