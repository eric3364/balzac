import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLegalPages, type LegalPage as LegalPageType } from '@/hooks/useLegalPages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText } from 'lucide-react';
import { SiteFooter } from '@/components/SiteFooter';

export const LegalPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getPageBySlug } = useLegalPages();
  const [page, setPage] = useState<LegalPageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadPage = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const pageData = await getPageBySlug(slug);
        if (pageData) {
          setPage(pageData);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la page:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [slug, getPageBySlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Chargement...</h1>
          <p className="text-muted-foreground">Chargement de la page légale</p>
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-4">Page non trouvée</h1>
            <p className="text-muted-foreground mb-6">
              La page légale que vous recherchez n'existe pas ou n'est plus disponible.
            </p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-lg font-semibold">{page.title}</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">{page.title}</CardTitle>
            {page.published_at && (
              <p className="text-sm text-muted-foreground">
                Dernière mise à jour : {new Date(page.updated_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="prose prose-slate max-w-none">
              {page.content ? (
                <div className="whitespace-pre-wrap leading-relaxed">
                  {page.content}
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  Le contenu de cette page n'est pas encore disponible.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
};