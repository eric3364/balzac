import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LevelPricing {
  level: number;
  price_euros: number;
  free_sessions: number;
  is_active: boolean;
}

export const useLevelPricing = () => {
  const [pricing, setPricing] = useState<LevelPricing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data, error } = await supabase
          .from('level_pricing')
          .select('level, price_euros, free_sessions, is_active')
          .eq('is_active', true)
          .order('level');

        if (error) throw error;
        setPricing(data || []);
      } catch (error) {
        console.error('Erreur lors du chargement des prix:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, []);

  return { pricing, loading };
};