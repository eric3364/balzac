import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAntiCheatConfig = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('site_configuration')
        .select('config_value')
        .eq('config_key', 'anti_cheat_enabled')
        .single();

      if (error) {
        console.error('Erreur lors du chargement de la configuration anti-triche:', error);
        // Par défaut, l'anti-triche est activé si on ne peut pas charger la config
        setIsEnabled(true);
      } else {
        setIsEnabled(data?.config_value === 'true' || data?.config_value === true);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setIsEnabled(true);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (enabled: boolean) => {
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase
        .from('site_configuration')
        .upsert({
          config_key: 'anti_cheat_enabled',
          config_value: enabled.toString(),
          updated_by: user.data.user?.id || null
        }, {
          onConflict: 'config_key'
        });

      if (error) throw error;
      setIsEnabled(enabled);
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la configuration anti-triche:', error);
      return false;
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return {
    isEnabled,
    loading,
    updateConfig
  };
};