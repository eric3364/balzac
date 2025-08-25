import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLegalPages, type LegalPage } from '@/hooks/useLegalPages';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Save, FileText, Eye } from 'lucide-react';

export const LegalPageManager = () => {
  const { pages, loading, updatePage, createPage, deletePage } = useLegalPages();
  const { toast } = useToast();
  const [editingPage, setEditingPage] = useState<LegalPage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    status: 'draft' as 'draft' | 'published'
  });

  const handleEditPage = (page: LegalPage) => {
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content || '',
      status: page.status
    });
    setEditingPage(page);
    setDialogOpen(true);
  };

  const handleNewPage = () => {
    setFormData({
      title: '',
      slug: '',
      content: '',
      status: 'draft'
    });
    setEditingPage(null);
    setDialogOpen(true);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: !editingPage ? generateSlug(title) : prev.slug
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.slug.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre et le slug sont obligatoires.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingPage) {
        await updatePage(editingPage.id, formData);
        toast({
          title: "Page modifiée",
          description: "La page légale a été modifiée avec succès.",
        });
      } else {
        await createPage(formData);
        toast({
          title: "Page créée",
          description: "La page légale a été créée avec succès.",
        });
      }
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la page.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (page: LegalPage) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${page.title}" ?`)) {
      return;
    }

    try {
      await deletePage(page.id);
      toast({
        title: "Page supprimée",
        description: "La page légale a été supprimée avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la page.",
        variant: "destructive",
      });
    }
  };

  const handlePublish = async (page: LegalPage) => {
    try {
      await updatePage(page.id, { status: 'published' });
      toast({
        title: "Page publiée",
        description: "La page légale est maintenant visible publiquement.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de publier la page.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Pages légales
            <Button onClick={handleNewPage}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle page
            </Button>
          </CardTitle>
          <CardDescription>
            Gérez le contenu de vos pages légales (mentions légales, politique de confidentialité, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pages.map((page) => (
              <div key={page.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium">{page.title}</h3>
                    <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                      {page.status === 'published' ? 'Publié' : 'Brouillon'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Slug: /{page.slug}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Mis à jour: {new Date(page.updated_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {page.status === 'published' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => window.open(`/legal/${page.slug}`, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleEditPage(page)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {page.status === 'draft' && (
                    <Button variant="ghost" size="sm" onClick={() => handlePublish(page)}>
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(page)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {pages.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                Aucune page légale créée
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPage ? 'Modifier la page' : 'Nouvelle page légale'}
            </DialogTitle>
            <DialogDescription>
              {editingPage 
                ? 'Modifiez le contenu de cette page légale'
                : 'Créez une nouvelle page pour vos mentions légales'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Mentions légales"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="mentions-legales"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: 'draft' | 'published') => setFormData(prev => ({ ...prev, status: value }))}
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

            <div className="space-y-2">
              <Label htmlFor="content">Contenu</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Contenu de la page légale..."
                rows={15}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};