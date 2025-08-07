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

      // Récupérer les certifications obtenues
      const { data: certifications } = await supabase
        .from('user_certifications')
        .select('level')
        .eq('user_id', user.id);

      // Récupérer les prix des niveaux depuis les templates de certificats
      const { data: pricing } = await supabase
        .from('certificate_templates')
        .select(`
          price_euros,
          difficulty_levels!inner(level_number)
        `)
        .eq('is_active', true);

      // Générer l'accès pour les niveaux 1 à 5
      const access: LevelAccess[] = [];
      
      for (let level = 1; level <= 5; level++) {
        const levelProgress = progressions?.find(p => p.level === level);
        const levelPricing = pricing?.find(p => p.difficulty_levels.level_number === level);
        const isFreeLevel = levelPricing?.price_euros === 0;
        const hasCertification = certifications?.some(c => c.level === level);
        
        // Déterminer si le niveau précédent est validé
        const previousLevelValidated = level === 1 || certifications?.some(c => c.level === level - 1);
        
        // Le niveau est débloqué si:
        // - C'est le niveau 1 OU le niveau précédent est validé (a une certification) 
        // - ET l'utilisateur a acheté le niveau (ou le niveau est gratuit)
        const hasAccess = isFreeLevel || hasValidPurchase(level);
        const isUnlocked = (level === 1 || previousLevelValidated) && hasAccess;

        access.push({
          level,
          isUnlocked,
          isCompleted: hasCertification || levelProgress?.is_level_completed || false,
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