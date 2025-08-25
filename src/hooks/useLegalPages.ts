import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LegalPage {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export const useLegalPages = () => {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPages = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_page')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPages((data || []) as LegalPage[]);
    } catch (error) {
      console.error('Erreur lors du chargement des pages légales:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPageBySlug = async (slug: string): Promise<LegalPage | null> => {
    try {
      const { data, error } = await supabase
        .from('legal_page')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }
      return data as LegalPage;
    } catch (error) {
      console.error('Erreur lors du chargement de la page:', error);
      return null;
    }
  };

  const updatePage = async (id: string, updates: Partial<LegalPage>) => {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
        ...(updates.status === 'published' && !updates.published_at && {
          published_at: new Date().toISOString()
        })
      };

      const { error } = await supabase
        .from('legal_page')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      await loadPages();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la page:', error);
      throw error;
    }
  };

  const createPage = async (page: Omit<LegalPage, 'id' | 'created_at' | 'updated_at' | 'published_at'>) => {
    try {
      const newPage = {
        ...page,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(page.status === 'published' && {
          published_at: new Date().toISOString()
        })
      };

      const { error } = await supabase
        .from('legal_page')
        .insert([newPage]);

      if (error) throw error;
      await loadPages();
    } catch (error) {
      console.error('Erreur lors de la création de la page:', error);
      throw error;
    }
  };

  const deletePage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('legal_page')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadPages();
    } catch (error) {
      console.error('Erreur lors de la suppression de la page:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  return {
    pages,
    loading,
    updatePage,
    createPage,
    deletePage,
    getPageBySlug,
    refetch: loadPages
  };
};