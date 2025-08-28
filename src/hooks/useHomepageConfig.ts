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
  bannerOpacity: number;
  siteTitle: string;
  siteSubtitle: string;
  heroTitle: string;
  heroDescription: string;
  heroBadgeColor: string;
  heroTitleColor: string;
  heroDescriptionColor: string;
  heroCta_primary: string;
  heroCta_secondary: string;
  featuresTitle: string;
  featuresDescription: string;
  // Features content
  feature1Title: string;
  feature1Description: string;
  feature2Title: string;
  feature2Description: string;
  feature3Title: string;
  feature3Description: string;
  feature4Title: string;
  feature4Description: string;
  feature5Title: string;
  feature5Description: string;
  feature6Title: string;
  feature6Description: string;
  // Stats section
  statsTitle: string;
  statsDescription: string;
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
    bannerOpacity: 100,
    siteTitle: 'Balzac Certification',
    siteSubtitle: 'Excellence en français',
    heroTitle: 'Maîtrisez le français avec excellence',
    heroDescription: 'Une plateforme de certification complète pour valider et perfectionner vos compétences en langue française',
    heroBadgeColor: '#6366f1',
    heroTitleColor: '#000000',
    heroDescriptionColor: '#6b7280',
    heroCta_primary: 'Commencer gratuitement',
    heroCta_secondary: 'Découvrir nos programmes',
    featuresTitle: 'Pourquoi choisir Balzac Certification ?',
    featuresDescription: 'Une approche moderne et rigoureuse pour certifier vos compétences linguistiques',
    // Features content
    feature1Title: 'Tests adaptatifs intelligents',
    feature1Description: 'Évaluations personnalisées adaptées à votre niveau avec l\'IA',
    feature2Title: 'Certifications reconnues',
    feature2Description: 'Certifications officielles valorisables professionnellement',
    feature3Title: 'Progression en temps réel',
    feature3Description: 'Tableaux de bord détaillés et statistiques personnalisées',
    feature4Title: 'Apprentissage flexible',
    feature4Description: 'Apprenez à votre rythme avec un accès 24h/24',
    feature5Title: 'Communauté active',
    feature5Description: 'Communauté d\'apprenants et accompagnement personnalisé',
    feature6Title: 'Excellence garantie',
    feature6Description: 'Méthodes pédagogiques éprouvées basées sur les dernières recherches en sciences cognitives',
    // Stats section
    statsTitle: 'Nos résultats parlent d\'eux-mêmes',
    statsDescription: 'Des chiffres qui témoignent de notre excellence',
    stat1Number: '10K+',
    stat1Label: 'Apprenants certifiés',
    stat2Number: '95%',
    stat2Label: 'Taux de satisfaction',
    stat3Number: '15+',
    stat3Label: 'Niveaux disponibles',
    ctaTitle: 'Travaillez votre employabilité',
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
          'homepage_logo_url', 'homepage_banner_url', 'homepage_banner_alt', 'homepage_banner_opacity',
          'site_title', 'site_subtitle', 'hero_title', 'hero_description',
          'hero_badge_color', 'hero_title_color', 'hero_description_color',
          'hero_cta_primary', 'hero_cta_secondary', 'features_title', 'features_description',
          'feature1_title', 'feature1_description', 'feature2_title', 'feature2_description',
          'feature3_title', 'feature3_description', 'feature4_title', 'feature4_description',
          'feature5_title', 'feature5_description', 'feature6_title', 'feature6_description',
          'stats_title', 'stats_description',
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
            case 'homepage_banner_opacity':
              configMap.bannerOpacity = value ? Number(value) : 100;
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
            case 'hero_badge_color':
              configMap.heroBadgeColor = value || '#6366f1';
              break;
            case 'hero_title_color':
              configMap.heroTitleColor = value || '#000000';
              break;
            case 'hero_description_color':
              configMap.heroDescriptionColor = value || '#6b7280';
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
            case 'feature1_title':
              configMap.feature1Title = value;
              break;
            case 'feature1_description':
              configMap.feature1Description = value;
              break;
            case 'feature2_title':
              configMap.feature2Title = value;
              break;
            case 'feature2_description':
              configMap.feature2Description = value;
              break;
            case 'feature3_title':
              configMap.feature3Title = value;
              break;
            case 'feature3_description':
              configMap.feature3Description = value;
              break;
            case 'feature4_title':
              configMap.feature4Title = value;
              break;
            case 'feature4_description':
              configMap.feature4Description = value;
              break;
            case 'feature5_title':
              configMap.feature5Title = value;
              break;
            case 'feature5_description':
              configMap.feature5Description = value;
              break;
            case 'feature6_title':
              configMap.feature6Title = value;
              break;
            case 'feature6_description':
              configMap.feature6Description = value;
              break;
            case 'stats_title':
              configMap.statsTitle = value;
              break;
            case 'stats_description':
              configMap.statsDescription = value;
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
          case 'bannerOpacity':
            configKey = 'homepage_banner_opacity';
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
          case 'heroBadgeColor':
            configKey = 'hero_badge_color';
            break;
          case 'heroTitleColor':
            configKey = 'hero_title_color';
            break;
          case 'heroDescriptionColor':
            configKey = 'hero_description_color';
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
          case 'feature1Title':
            configKey = 'feature1_title';
            break;
          case 'feature1Description':
            configKey = 'feature1_description';
            break;
          case 'feature2Title':
            configKey = 'feature2_title';
            break;
          case 'feature2Description':
            configKey = 'feature2_description';
            break;
          case 'feature3Title':
            configKey = 'feature3_title';
            break;
          case 'feature3Description':
            configKey = 'feature3_description';
            break;
          case 'feature4Title':
            configKey = 'feature4_title';
            break;
          case 'feature4Description':
            configKey = 'feature4_description';
            break;
          case 'feature5Title':
            configKey = 'feature5_title';
            break;
          case 'feature5Description':
            configKey = 'feature5_description';
            break;
          case 'feature6Title':
            configKey = 'feature6_title';
            break;
          case 'feature6Description':
            configKey = 'feature6_description';
            break;
          case 'statsTitle':
            configKey = 'stats_title';
            break;
          case 'statsDescription':
            configKey = 'stats_description';
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