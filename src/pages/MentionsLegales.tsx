import React from 'react';
import { usePublicLegalPage } from '@/hooks/useLegalPage';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MentionsLegales: React.FC = () => {
  const { page, loading, notFound } = usePublicLegalPage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Page non trouvée</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              La page de mentions légales n'est pas disponible pour le moment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Simple Markdown to HTML conversion for basic formatting
  const formatContent = (content: string | null) => {
    if (!content) return '';
    
    return content
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-6">$1</h1>')
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br>');
  };

  const formattedContent = formatContent(page.content);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-8 text-foreground">
            {page.title}
          </h1>
          
          <div className="text-muted-foreground mb-4 text-sm">
            {page.published_at && (
              <p>
                Publié le : {new Date(page.published_at).toLocaleDateString('fr-FR')}
              </p>
            )}
            {page.updated_at && page.updated_at !== page.published_at && (
              <p>
                Mis à jour le : {new Date(page.updated_at).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>

          <div 
            className="legal-content leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: `<p class="mb-4">${formattedContent}</p>` 
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MentionsLegales;