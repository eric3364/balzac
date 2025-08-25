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
      // Temporary: use empty array since table doesn't exist yet
      const data: LegalPage[] = [];
      setPages(data);
    } catch (error) {
      console.error('Erreur lors du chargement des pages légales:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPageBySlug = async (slug: string): Promise<LegalPage | null> => {
    try {
      // Temporary: return null since table doesn't exist yet
      console.log('Would fetch page with slug:', slug);
      return null;
    } catch (error) {
      console.error('Erreur lors du chargement de la page:', error);
      return null;
    }
  };

  const updatePage = async (id: string, updates: Partial<LegalPage>) => {
    try {
      // Temporary: functionality disabled until tables are created
      console.log('Page would be updated:', id, updates);
      throw new Error('Tables not yet created');
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la page:', error);
      throw error;
    }
  };

  const createPage = async (page: Omit<LegalPage, 'id' | 'created_at' | 'updated_at' | 'published_at'>) => {
    try {
      // Temporary: functionality disabled until tables are created
      console.log('Page would be created:', page);
      throw new Error('Tables not yet created');
    } catch (error) {
      console.error('Erreur lors de la création de la page:', error);
      throw error;
    }
  };

  const deletePage = async (id: string) => {
    try {
      // Temporary: functionality disabled until tables are created
      console.log('Page would be deleted:', id);
      throw new Error('Tables not yet created');
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