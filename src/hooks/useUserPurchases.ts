import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useImpersonation } from './useImpersonation';

interface UserPurchase {
  level: number;
  price_paid: number;
  status: string;
  purchased_at: string;
}

export const useUserPurchases = () => {
  const { user } = useAuth();
  const { impersonatedUser, isImpersonating } = useImpersonation();
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  // Utiliser l'ID de l'utilisateur impersonné si en mode impersonnation
  const effectiveUserId = isImpersonating && impersonatedUser ? impersonatedUser.user_id : user?.id;

  const loadPurchases = useCallback(async () => {
    if (!effectiveUserId) {
      setPurchases([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_level_purchases')
        .select('level, price_paid, status, purchased_at')
        .eq('user_id', effectiveUserId)
        .eq('status', 'completed')
        .order('level');

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des achats:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const hasValidPurchase = useCallback((level: number) => {
    return purchases.some(p => p.level === level && p.status === 'completed');
  }, [purchases]);

  return {
    purchases,
    loading,
    hasValidPurchase,
    refetch: loadPurchases
  };
};