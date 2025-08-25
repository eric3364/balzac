import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LegalPage {
  id?: string;
  title: string;
  slug: string;
  content: string | null;
  status: 'draft' | 'published';
  published_at?: string | null;
  updated_at?: string;
}

export const useLegalPage = () => {
  const [page, setPage] = useState<LegalPage>({
    title: 'Mentions légales',
    slug: 'mentions-legales',
    content: '',
    status: 'draft',
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPage = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_page')
        .select('*')
        .eq('slug', 'mentions-legales')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPage({
          ...data,
          content: data.content || '',
          status: data.status as 'draft' | 'published'
        });
      }
    } catch (error) {
      console.error('Error fetching legal page:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la page de mentions légales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePage = async (updates: Partial<LegalPage>) => {
    try {
      const updateData = { ...page, ...updates };
      
      // Set published_at when publishing
      if (updates.status === 'published' && page.status !== 'published') {
        updateData.published_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('legal_page')
        .upsert(updateData)
        .select()
        .single();

      if (error) throw error;

      setPage({
        ...data,
        content: data.content || '',
        status: data.status as 'draft' | 'published'
      });
      toast({
        title: "Succès",
        description: `Page ${data.status === 'published' ? 'publiée' : 'sauvegardée'}`,
      });

      return data;
    } catch (error) {
      console.error('Error updating legal page:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la page",
        variant: "destructive",
      });
      throw error;
    }
  };

  const publishPage = async () => {
    return updatePage({ status: 'published' });
  };

  const unpublishPage = async () => {
    return updatePage({ status: 'draft' });
  };

  useEffect(() => {
    fetchPage();
  }, []);

  return {
    page,
    loading,
    updatePage,
    publishPage,
    unpublishPage,
    refetch: fetchPage,
  };
};

export const usePublicLegalPage = () => {
  const [page, setPage] = useState<LegalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchPublicPage = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_page')
        .select('*')
        .eq('slug', 'mentions-legales')
        .eq('status', 'published')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setNotFound(true);
        } else {
          throw error;
        }
        return;
      }

      setPage({
        ...data,
        content: data.content || '',
        status: data.status as 'draft' | 'published'
      });
    } catch (error) {
      console.error('Error fetching public legal page:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicPage();
  }, []);

  return {
    page,
    loading,
    notFound,
  };
};