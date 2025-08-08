import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Debounce utility
function useDebounce(callback: Function, delay: number) {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback((...args: any[]) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    const newTimer = setTimeout(() => {
      callback(...args);
    }, delay);
    
    setDebounceTimer(newTimer);
  }, [callback, delay, debounceTimer]);

  return debouncedCallback;
}

interface HomepageConfig {
  logoUrl: string;
  bannerUrl: string;
  bannerAlt: string;
  siteTitle: string;
  siteSubtitle: string;
  heroTitle: string;
  heroDescription: string;
  heroCta_primary: string;
  heroCta_secondary: string;
  featuresTitle: string;
  featuresDescription: string;
  stat1Number: string;
  stat1Label: string;
  stat2Number: string;
  stat2Label: string;
  stat3Number: string;
  stat3Label: string;
  ctaTitle: string;
  ctaDescription: string;
  ctaButton: string;
  ctaBadge: string;
  ctaSubDescription: string;
  loading: boolean;
}

export const useHomepageConfig = () => {
  const [config, setConfig] = useState<HomepageConfig>({
    logoUrl: '',
    bannerUrl: '',
    bannerAlt: 'Bandeau visuel',
    siteTitle: 'Balzac Certification',
    siteSubtitle: 'Excellence en français',
    heroTitle: 'Maîtrisez le français avec excellence',
    heroDescription: 'Une plateforme de certification complète pour valider et perfectionner vos compétences en langue française',
    heroCta_primary: 'Commencer gratuitement',
    heroCta_secondary: 'Découvrir nos programmes',
    featuresTitle: 'Pourquoi choisir Balzac Certification ?',
    featuresDescription: 'Une approche moderne et rigoureuse pour certifier vos compétences linguistiques',
    stat1Number: '10K+',
    stat1Label: 'Apprenants certifiés',
    stat2Number: '95%',
    stat2Label: 'Taux de satisfaction',
    stat3Number: '15+',
    stat3Label: 'Niveaux disponibles',
    ctaTitle: 'Prêt à certifier vos compétences ?',
    ctaDescription: 'Rejoignez des milliers d\'apprenants qui ont déjà validé leur maîtrise du français',
    ctaButton: 'Commencer maintenant',
    ctaBadge: 'Commencez dès maintenant',
    ctaSubDescription: 'Démarrez gratuitement avec le niveau 1 puis progressez à votre rythme',
    loading: true,
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configKeys = [
          'homepage_logo_url', 'homepage_banner_url', 'homepage_banner_alt',
          'site_title', 'site_subtitle', 'hero_title', 'hero_description',
          'hero_cta_primary', 'hero_cta_secondary', 'features_title', 'features_description',
          'stat1_number', 'stat1_label', 'stat2_number', 'stat2_label', 'stat3_number', 'stat3_label',
          'cta_title', 'cta_description', 'cta_button', 'cta_badge', 'cta_sub_description'
        ];
        
        const { data } = await supabase
          .from('site_configuration')
          .select('config_key, config_value')
          .in('config_key', configKeys);

        const configMap: any = {};
        data?.forEach(item => {
          let value = '';
          const rawValue = item.config_value;
          
          if (rawValue) {
            // Si la valeur est déjà une string sans guillemets JSON, l'utiliser directement
            if (typeof rawValue === 'string' && !rawValue.startsWith('"')) {
              value = rawValue;
            } else {
              // Sinon, essayer de parser le JSON
              try {
                value = String(JSON.parse(String(rawValue)));
              } catch {
                value = String(rawValue);
              }
            }
          }
          
          switch (item.config_key) {
            case 'homepage_logo_url':
              configMap.logoUrl = value;
              break;
            case 'homepage_banner_url':
              configMap.bannerUrl = value;
              break;
            case 'homepage_banner_alt':
              configMap.bannerAlt = value;
              break;
            case 'site_title':
              configMap.siteTitle = value;
              break;
            case 'site_subtitle':
              configMap.siteSubtitle = value;
              break;
            case 'hero_title':
              configMap.heroTitle = value;
              break;
            case 'hero_description':
              configMap.heroDescription = value;
              break;
            case 'hero_cta_primary':
              configMap.heroCta_primary = value;
              break;
            case 'hero_cta_secondary':
              configMap.heroCta_secondary = value;
              break;
            case 'features_title':
              configMap.featuresTitle = value;
              break;
            case 'features_description':
              configMap.featuresDescription = value;
              break;
            case 'stat1_number':
              configMap.stat1Number = value;
              break;
            case 'stat1_label':
              configMap.stat1Label = value;
              break;
            case 'stat2_number':
              configMap.stat2Number = value;
              break;
            case 'stat2_label':
              configMap.stat2Label = value;
              break;
            case 'stat3_number':
              configMap.stat3Number = value;
              break;
            case 'stat3_label':
              configMap.stat3Label = value;
              break;
            case 'cta_title':
              configMap.ctaTitle = value;
              break;
            case 'cta_description':
              configMap.ctaDescription = value;
              break;
            case 'cta_button':
              configMap.ctaButton = value;
              break;
            case 'cta_badge':
              configMap.ctaBadge = value;
              break;
            case 'cta_sub_description':
              configMap.ctaSubDescription = value;
              break;
          }
        });

        setConfig(prev => ({
          ...prev,
          ...configMap,
          loading: false,
        }));
      } catch (error) {
        console.error('Erreur lors de la récupération de la configuration:', error);
        setConfig(prev => ({ ...prev, loading: false }));
      }
    };

    fetchConfig();
  }, []);

  const updateConfigToDatabase = async (updates: Partial<Omit<HomepageConfig, 'loading'>>) => {
    try {
      console.log('Updating homepage config to database:', updates);
      const configUpdates = Object.entries(updates).map(([key, value]) => {
        let configKey = '';
        
        switch (key) {
          case 'logoUrl':
            configKey = 'homepage_logo_url';
            break;
          case 'bannerUrl':
            configKey = 'homepage_banner_url';
            break;
          case 'bannerAlt':
            configKey = 'homepage_banner_alt';
            break;
          case 'siteTitle':
            configKey = 'site_title';
            break;
          case 'siteSubtitle':
            configKey = 'site_subtitle';
            break;
          case 'heroTitle':
            configKey = 'hero_title';
            break;
          case 'heroDescription':
            configKey = 'hero_description';
            break;
          case 'heroCta_primary':
            configKey = 'hero_cta_primary';
            break;
          case 'heroCta_secondary':
            configKey = 'hero_cta_secondary';
            break;
          case 'featuresTitle':
            configKey = 'features_title';
            break;
          case 'featuresDescription':
            configKey = 'features_description';
            break;
          case 'stat1Number':
            configKey = 'stat1_number';
            break;
          case 'stat1Label':
            configKey = 'stat1_label';
            break;
          case 'stat2Number':
            configKey = 'stat2_number';
            break;
          case 'stat2Label':
            configKey = 'stat2_label';
            break;
          case 'stat3Number':
            configKey = 'stat3_number';
            break;
          case 'stat3Label':
            configKey = 'stat3_label';
            break;
          case 'ctaTitle':
            configKey = 'cta_title';
            break;
          case 'ctaDescription':
            configKey = 'cta_description';
            break;
          case 'ctaButton':
            configKey = 'cta_button';
            break;
          case 'ctaBadge':
            configKey = 'cta_badge';
            break;
          case 'ctaSubDescription':
            configKey = 'cta_sub_description';
            break;
          default:
            return null;
        }
        
        return { config_key: configKey, config_value: JSON.stringify(value) };
      }).filter(Boolean);

      for (const update of configUpdates) {
        if (update) {
          await supabase
            .from('site_configuration')
            .upsert(update, { onConflict: 'config_key' });
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la configuration:', error);
      return false;
    }
  };

  const debouncedUpdateConfig = useDebounce(updateConfigToDatabase, 1000);

  const updateConfig = (updates: Partial<Omit<HomepageConfig, 'loading'>>) => {
    // Mettre à jour immédiatement l'état local pour la réactivité
    setConfig(prev => ({ ...prev, ...updates }));
    
    // Débouncer la sauvegarde en base de données
    debouncedUpdateConfig(updates);
    
    return Promise.resolve(true);
  };

  return { config, updateConfig };
};