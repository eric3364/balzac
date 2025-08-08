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
          .from('certificate_templates')
          .select(`
            price_euros, 
            free_sessions, 
            is_active,
            difficulty_levels!inner(level_number)
          `)
          .eq('is_active', true);

        if (error) throw error;
        
        const formattedData = (data || []).map((item: any) => ({
          level: item.difficulty_levels.level_number,
          price_euros: item.price_euros,
          free_sessions: item.free_sessions,
          is_active: item.is_active
        })).sort((a, b) => a.level - b.level);
        
        setPricing(formattedData);
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