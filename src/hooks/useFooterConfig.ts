import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FooterConfig {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  mentions_legales: string;
  politique_confidentialite: string;
  conditions_utilisation: string;
  copyright_text: string;
  social_links: {
    facebook: string;
    twitter: string;
    linkedin: string;
    instagram: string;
  };
}

export const useFooterConfig = () => {
  const [config, setConfig] = useState<FooterConfig>({
    company_name: 'Balzac Certification',
    company_address: '',
    company_phone: '',
    company_email: '',
    mentions_legales: '',
    politique_confidentialite: '',
    conditions_utilisation: '',
    copyright_text: '© 2024 Balzac Certification. Tous droits réservés.',
    social_links: {
      facebook: '',
      twitter: '',
      linkedin: '',
      instagram: ''
    }
  });
  const [loading, setLoading] = useState(true);

  const loadConfig = async () => {
    try {
      const { data: configs, error } = await supabase
        .from('site_configuration')
        .select('config_key, config_value')
        .in('config_key', [
          'footer_company_name', 'footer_company_address', 'footer_company_phone', 'footer_company_email',
          'footer_mentions_legales', 'footer_politique_confidentialite', 'footer_conditions_utilisation',
          'footer_copyright_text', 'footer_social_facebook', 'footer_social_twitter', 
          'footer_social_linkedin', 'footer_social_instagram'
        ]);

      if (error) throw error;

      if (configs && configs.length > 0) {
        const configObj = configs.reduce((acc, config) => {
          acc[config.config_key] = config.config_value;
          return acc;
        }, {} as any);

        setConfig(prev => ({
          ...prev,
          company_name: configObj.footer_company_name || prev.company_name,
          company_address: configObj.footer_company_address || prev.company_address,
          company_phone: configObj.footer_company_phone || prev.company_phone,
          company_email: configObj.footer_company_email || prev.company_email,
          mentions_legales: configObj.footer_mentions_legales || prev.mentions_legales,
          politique_confidentialite: configObj.footer_politique_confidentialite || prev.politique_confidentialite,
          conditions_utilisation: configObj.footer_conditions_utilisation || prev.conditions_utilisation,
          copyright_text: configObj.footer_copyright_text || prev.copyright_text,
          social_links: {
            facebook: configObj.footer_social_facebook || prev.social_links.facebook,
            twitter: configObj.footer_social_twitter || prev.social_links.twitter,
            linkedin: configObj.footer_social_linkedin || prev.social_links.linkedin,
            instagram: configObj.footer_social_instagram || prev.social_links.instagram
          }
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration du footer:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<FooterConfig>) => {
    const configEntries = [
      { config_key: 'footer_company_name', config_value: newConfig.company_name },
      { config_key: 'footer_company_address', config_value: newConfig.company_address },
      { config_key: 'footer_company_phone', config_value: newConfig.company_phone },
      { config_key: 'footer_company_email', config_value: newConfig.company_email },
      { config_key: 'footer_mentions_legales', config_value: newConfig.mentions_legales },
      { config_key: 'footer_politique_confidentialite', config_value: newConfig.politique_confidentialite },
      { config_key: 'footer_conditions_utilisation', config_value: newConfig.conditions_utilisation },
      { config_key: 'footer_copyright_text', config_value: newConfig.copyright_text }
    ];

    if (newConfig.social_links) {
      configEntries.push(
        { config_key: 'footer_social_facebook', config_value: newConfig.social_links.facebook },
        { config_key: 'footer_social_twitter', config_value: newConfig.social_links.twitter },
        { config_key: 'footer_social_linkedin', config_value: newConfig.social_links.linkedin },
        { config_key: 'footer_social_instagram', config_value: newConfig.social_links.instagram }
      );
    }

    for (const entry of configEntries) {
      if (entry.config_value !== undefined) {
        const { error } = await supabase
          .from('site_configuration')
          .upsert({
            config_key: entry.config_key,
            config_value: entry.config_value
          }, {
            onConflict: 'config_key'
          });

        if (error) throw error;
      }
    }

    // Mettre à jour l'état local
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return { config, loading, updateConfig, refetch: loadConfig };
};