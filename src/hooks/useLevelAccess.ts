import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface LevelAccess {
  level: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  currentSessionNumber: number;
}

export const useLevelAccess = () => {
  const { user } = useAuth();
  const [levelAccess, setLevelAccess] = useState<LevelAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLevelAccess = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Récupérer toutes les progressions de l'utilisateur
      const { data: progressions } = await supabase
        .from('session_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('level', { ascending: true });

      // Générer l'accès pour les niveaux 1 à 5
      const access: LevelAccess[] = [];
      
      for (let level = 1; level <= 5; level++) {
        const levelProgress = progressions?.find(p => p.level === level);
        
        // Le niveau 1 est toujours débloqué
        // Les autres niveaux sont débloqués si le niveau précédent est complété
        let isUnlocked = level === 1;
        
        if (level > 1) {
          const previousLevelProgress = progressions?.find(p => p.level === level - 1);
          isUnlocked = previousLevelProgress?.is_level_completed || false;
        }

        access.push({
          level,
          isUnlocked,
          isCompleted: levelProgress?.is_level_completed || false,
          currentSessionNumber: levelProgress?.current_session_number || parseFloat(`${level}.1`)
        });
      }

      setLevelAccess(access);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'accès aux niveaux:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadLevelAccess();
  }, [loadLevelAccess]);

  return {
    levelAccess,
    loading,
    refetch: loadLevelAccess
  };
};