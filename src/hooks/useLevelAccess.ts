import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPurchases } from './useUserPurchases';

interface LevelAccess {
  level: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  currentSessionNumber: number;
}

export const useLevelAccess = () => {
  const { user } = useAuth();
  const { hasValidPurchase, loading: purchasesLoading } = useUserPurchases();
  const [levelAccess, setLevelAccess] = useState<LevelAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLevelAccess = useCallback(async () => {
    if (!user || purchasesLoading) return;

    try {
      setLoading(true);

      // Récupérer toutes les progressions de l'utilisateur
      const { data: progressions } = await supabase
        .from('session_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('level', { ascending: true });

      // Récupérer les prix des niveaux
      const { data: pricing } = await supabase
        .from('level_pricing')
        .select('level, price_euros')
        .eq('is_active', true);

      // Générer l'accès pour les niveaux 1 à 5
      const access: LevelAccess[] = [];
      
      for (let level = 1; level <= 5; level++) {
        const levelProgress = progressions?.find(p => p.level === level);
        const levelPricing = pricing?.find(p => p.level === level);
        const isFreeLevel = levelPricing?.price_euros === 0;
        
        // Le niveau 1 est toujours débloqué
        // Les autres niveaux sont débloqués si:
        // - Le niveau précédent est complété ET
        // - L'utilisateur a acheté le niveau (ou le niveau est gratuit)
        let isUnlocked = level === 1;
        
        if (level > 1) {
          const previousLevelProgress = progressions?.find(p => p.level === level - 1);
          const previousLevelCompleted = previousLevelProgress?.is_level_completed || false;
          const hasAccess = isFreeLevel || hasValidPurchase(level);
          
          isUnlocked = previousLevelCompleted && hasAccess;
        } else {
          // Pour le niveau 1, vérifier aussi l'accès
          isUnlocked = isFreeLevel || hasValidPurchase(level);
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
  }, [user, hasValidPurchase, purchasesLoading]);

  useEffect(() => {
    loadLevelAccess();
  }, [loadLevelAccess]);

  return {
    levelAccess,
    loading,
    refetch: loadLevelAccess
  };
};