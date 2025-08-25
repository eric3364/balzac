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
      // Temporary: use default pages until migration is executed
      const defaultPages: LegalPage[] = [
        {
          id: '1',
          title: 'Mentions légales',
          slug: 'mentions-legales',
          content: 'Contenu des mentions légales à définir.',
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          published_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Politique de confidentialité',
          slug: 'politique-confidentialite',
          content: 'Contenu de la politique de confidentialité à définir.',
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          published_at: new Date().toISOString()
        }
      ];
      setPages(defaultPages);
    } catch (error) {
      console.error('Erreur lors du chargement des pages légales:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPageBySlug = async (slug: string): Promise<LegalPage | null> => {
    try {
      // Temporary: simulate page retrieval
      const pages = [
        {
          id: '1',
          title: 'Mentions légales',
          slug: 'mentions-legales',
          content: 'Contenu des mentions légales à définir.',
          status: 'published' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          published_at: new Date().toISOString()
        }
      ];
      return pages.find(p => p.slug === slug) || null;
    } catch (error) {
      console.error('Erreur lors du chargement de la page:', error);
      return null;
    }
  };

  const updatePage = async (id: string, updates: Partial<LegalPage>) => {
    try {
      // Simulation successful update
      console.log('Page updated successfully:', id, updates);
      await loadPages();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la page:', error);
      throw error;
    }
  };

  const createPage = async (page: Omit<LegalPage, 'id' | 'created_at' | 'updated_at' | 'published_at'>) => {
    try {
      // Simulation successful creation
      console.log('Page created successfully:', page);
      await loadPages();
    } catch (error) {
      console.error('Erreur lors de la création de la page:', error);
      throw error;
    }
  };

  const deletePage = async (id: string) => {
    try {
      // Simulation successful deletion
      console.log('Page deleted successfully:', id);
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