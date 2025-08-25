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
        .maybeSingle();

      if (settingsError) {
        throw settingsError;
      }

      const { data: socialData, error: socialError } = await supabase
        .from('footer_social_links')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (socialError) throw socialError;

      const { data: linksData, error: linksError } = await supabase
        .from('footer_links')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (linksError) throw linksError;

      const mappedSettings: FooterSettings = settingsData || {
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
      setSocialLinks(socialData || []);
      setFooterLinks(linksData || []);
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
      const { error } = await supabase
        .from('footer_social_links')
        .insert([link]);

      if (error) throw error;
      await loadSettings();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du lien social:', error);
      throw error;
    }
  };

  const updateSocialLink = async (id: string, updates: Partial<SocialLink>) => {
    try {
      const { error } = await supabase
        .from('footer_social_links')
        .update({...updates, updated_at: new Date().toISOString()})
        .eq('id', id);

      if (error) throw error;
      await loadSettings();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du lien social:', error);
      throw error;
    }
  };

  const deleteSocialLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('footer_social_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadSettings();
    } catch (error) {
      console.error('Erreur lors de la suppression du lien social:', error);
      throw error;
    }
  };

  const addFooterLink = async (link: Omit<FooterLink, 'id'>) => {
    try {
      const { error } = await supabase
        .from('footer_links')
        .insert([link]);

      if (error) throw error;
      await loadSettings();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du lien:', error);
      throw error;
    }
  };

  const updateFooterLink = async (id: string, updates: Partial<FooterLink>) => {
    try {
      const { error } = await supabase
        .from('footer_links')
        .update({...updates, updated_at: new Date().toISOString()})
        .eq('id', id);

      if (error) throw error;
      await loadSettings();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du lien:', error);
      throw error;
    }
  };

  const deleteFooterLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('footer_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadSettings();
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