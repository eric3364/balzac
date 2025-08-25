import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useLegalPage } from '@/hooks/useLegalPage';
import { Loader2, ExternalLink, Save, Eye } from 'lucide-react';

const LegalPageManager: React.FC = () => {
  const { page, loading, updatePage, publishPage, unpublishPage } = useLegalPage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveDraft = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      await updatePage({
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        status: 'draft',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    
    try {
      const form = document.querySelector('form') as HTMLFormElement;
      const formData = new FormData(form);
      await updatePage({
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        status: 'published',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: 'draft' | 'published') => {
    if (newStatus === 'published') {
      await publishPage();
    } else {
      await unpublishPage();
    }
  };

  const openPreview = () => {
    window.open('/mentions-legales', '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Gestion des Mentions Légales
            <div className="flex items-center space-x-2">
              <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                {page.status === 'published' ? 'Publié' : 'Brouillon'}
              </Badge>
              {page.status === 'published' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openPreview}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Voir
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Éditez le contenu de votre page de mentions légales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveDraft} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de la page</Label>
              <Input
                id="title"
                name="title"
                defaultValue={page.title}
                placeholder="Mentions légales"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL (slug)</Label>
              <Input
                id="slug"
                name="slug"
                value={page.slug}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                L'URL est fixe pour garantir la cohérence des liens
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Contenu</Label>
              <Textarea
                id="content"
                name="content"
                defaultValue={page.content || ''}
                rows={20}
                className="font-mono text-sm"
                placeholder="Contenu en Markdown..."
              />
              <p className="text-sm text-muted-foreground">
                Vous pouvez utiliser la syntaxe Markdown pour formater votre contenu
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={page.status}
                onValueChange={(value) => handleStatusChange(value as 'draft' | 'published')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2">
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Enregistrer le brouillon
              </Button>

              <Button
                type="button"
                onClick={handlePublish}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Publier
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {page.published_at && (
        <Card>
          <CardHeader>
            <CardTitle>Informations de publication</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Publié le : {new Date(page.published_at).toLocaleString('fr-FR')}
            </p>
            {page.updated_at && (
              <p className="text-sm text-muted-foreground">
                Dernière modification : {new Date(page.updated_at).toLocaleString('fr-FR')}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LegalPageManager;