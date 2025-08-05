import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HomepageConfig {
  logoUrl: string;
  bannerUrl: string;
  bannerAlt: string;
  loading: boolean;
}

export const useHomepageConfig = () => {
  const [config, setConfig] = useState<HomepageConfig>({
    logoUrl: '',
    bannerUrl: '',
    bannerAlt: 'Bandeau visuel',
    loading: true,
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await supabase
          .from('site_configuration')
          .select('config_key, config_value')
          .in('config_key', ['homepage_logo_url', 'homepage_banner_url', 'homepage_banner_alt']);

        const configMap: Record<string, string> = {};
        data?.forEach(item => {
          configMap[item.config_key] = typeof item.config_value === 'string' 
            ? item.config_value 
            : JSON.stringify(item.config_value).replace(/"/g, '');
        });

        setConfig({
          logoUrl: configMap['homepage_logo_url'] || '',
          bannerUrl: configMap['homepage_banner_url'] || '',
          bannerAlt: configMap['homepage_banner_alt'] || 'Bandeau visuel',
          loading: false,
        });
      } catch (error) {
        console.error('Erreur lors de la récupération de la configuration:', error);
        setConfig(prev => ({ ...prev, loading: false }));
      }
    };

    fetchConfig();
  }, []);

  const updateConfig = async (updates: Partial<Omit<HomepageConfig, 'loading'>>) => {
    try {
      const configUpdates = Object.entries(updates).map(([key, value]) => {
        const configKey = key === 'logoUrl' ? 'homepage_logo_url' 
          : key === 'bannerUrl' ? 'homepage_banner_url'
          : key === 'bannerAlt' ? 'homepage_banner_alt' : null;
        
        if (!configKey) return null;
        
        return { config_key: configKey, config_value: JSON.stringify(value) };
      }).filter(Boolean);

      for (const update of configUpdates) {
        if (update) {
          await supabase
            .from('site_configuration')
            .upsert(update, { onConflict: 'config_key' });
        }
      }

      setConfig(prev => ({ ...prev, ...updates }));
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la configuration:', error);
      return false;
    }
  };

  return { config, updateConfig };
};