import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserPurchase {
  level: number;
  price_paid: number;
  status: string;
  purchased_at: string;
}

export const useUserPurchases = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPurchases = useCallback(async () => {
    if (!user) {
      setPurchases([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_level_purchases')
        .select('level, price_paid, status, purchased_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('level');

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des achats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

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