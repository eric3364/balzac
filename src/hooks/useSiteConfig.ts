import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SiteConfig {
  questionsPerTest: number;
  loading: boolean;
}

export const useSiteConfig = () => {
  const [config, setConfig] = useState<SiteConfig>({
    questionsPerTest: 5, // valeur par défaut
    loading: true,
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await supabase
          .from('site_configuration')
          .select('config_value')
          .eq('config_key', 'questions_per_test')
          .maybeSingle();

        const questionsPerTest = data?.config_value ? Number(data.config_value) : 5;

        setConfig({
          questionsPerTest,
          loading: false,
        });
      } catch (error) {
        console.error('Erreur lors de la récupération de la configuration:', error);
        setConfig(prev => ({ ...prev, loading: false }));
      }
    };

    fetchConfig();
  }, []);

  return config;
};