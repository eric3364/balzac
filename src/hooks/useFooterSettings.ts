import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FooterSettings {
  id?: string;
  copyright_text: string;
  legal_link_label: string;
  legal_link_enabled: boolean;
  updated_at?: string;
}

export const useFooterSettings = () => {
  const [settings, setSettings] = useState<FooterSettings>({
    copyright_text: '© 2025 NEXT-U – Tous droits réservés.',
    legal_link_label: 'Mentions légales',
    legal_link_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('footer_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching footer settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres du footer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<FooterSettings>) => {
    try {
      const { data, error } = await supabase
        .from('footer_settings')
        .upsert({ ...settings, ...newSettings })
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      toast({
        title: "Succès",
        description: "Paramètres du footer mis à jour",
      });

      return data;
    } catch (error) {
      console.error('Error updating footer settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les paramètres",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
};