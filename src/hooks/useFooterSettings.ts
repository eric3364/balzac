import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FooterSettings {
  id: string;
  copyright_text: string;
  company_address: string | null;
  company_email: string | null;
  company_phone: string | null;
  cookie_management_url: string | null;
  legal_link_enabled: boolean;
  legal_link_label: string;
}

export interface SocialLink {
  id: string;
  name: string;
  url: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface FooterLink {
  id: string;
  label: string;
  url: string;
  sort_order: number;
  is_legal: boolean;
  is_active: boolean;
}

export const useFooterSettings = () => {
  const [settings, setSettings] = useState<FooterSettings | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('footer_settings')
        .select('*')
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      // Temporary: use empty arrays since tables don't exist yet
      const socialData: SocialLink[] = [];
      const linksData: FooterLink[] = [];

      // Temporary: use default values since tables don't exist yet
      const mappedSettings: FooterSettings = {
        id: '',
        copyright_text: '© 2025 NEXT-U – Tous droits réservés.',
        company_address: null,
        company_email: null,
        company_phone: null,
        cookie_management_url: '#',
        legal_link_enabled: true,
        legal_link_label: 'Mentions légales'
      };

      setSettings(mappedSettings);
      setSocialLinks(socialData);
      setFooterLinks(linksData);
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres du footer:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<FooterSettings>) => {
    try {
      const { error } = await supabase
        .from('footer_settings')
        .upsert(newSettings, { onConflict: 'id' });

      if (error) throw error;
      
      await loadSettings();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres:', error);
      throw error;
    }
  };

  const addSocialLink = async (link: Omit<SocialLink, 'id'>) => {
    try {
      // Temporary: functionality disabled until tables are created
      console.log('Social link would be added:', link);
      throw new Error('Tables not yet created');
    } catch (error) {
      console.error('Erreur lors de l\'ajout du lien social:', error);
      throw error;
    }
  };

  const updateSocialLink = async (id: string, updates: Partial<SocialLink>) => {
    try {
      // Temporary: functionality disabled until tables are created
      console.log('Social link would be updated:', id, updates);
      throw new Error('Tables not yet created');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du lien social:', error);
      throw error;
    }
  };

  const deleteSocialLink = async (id: string) => {
    try {
      // Temporary: functionality disabled until tables are created
      console.log('Social link would be deleted:', id);
      throw new Error('Tables not yet created');
    } catch (error) {
      console.error('Erreur lors de la suppression du lien social:', error);
      throw error;
    }
  };

  const addFooterLink = async (link: Omit<FooterLink, 'id'>) => {
    try {
      // Temporary: functionality disabled until tables are created
      console.log('Footer link would be added:', link);
      throw new Error('Tables not yet created');
    } catch (error) {
      console.error('Erreur lors de l\'ajout du lien:', error);
      throw error;
    }
  };

  const updateFooterLink = async (id: string, updates: Partial<FooterLink>) => {
    try {
      // Temporary: functionality disabled until tables are created
      console.log('Footer link would be updated:', id, updates);
      throw new Error('Tables not yet created');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du lien:', error);
      throw error;
    }
  };

  const deleteFooterLink = async (id: string) => {
    try {
      // Temporary: functionality disabled until tables are created
      console.log('Footer link would be deleted:', id);
      throw new Error('Tables not yet created');
    } catch (error) {
      console.error('Erreur lors de la suppression du lien:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    socialLinks,
    footerLinks,
    loading,
    updateSettings,
    addSocialLink,
    updateSocialLink,
    deleteSocialLink,
    addFooterLink,
    updateFooterLink,
    deleteFooterLink,
    refetch: loadSettings
  };
};