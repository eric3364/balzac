import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFooterSettings, type SocialLink, type FooterLink } from '@/hooks/useFooterSettings';
import { useLegalPages } from '@/hooks/useLegalPages';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Save, ExternalLink, GripVertical } from 'lucide-react';

export const FooterManager = () => {
  const { settings, socialLinks, footerLinks, loading, updateSettings, addSocialLink, updateSocialLink, deleteSocialLink, addFooterLink, updateFooterLink, deleteFooterLink } = useFooterSettings();
  const { pages } = useLegalPages();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingSocial, setEditingSocial] = useState<SocialLink | null>(null);
  const [editingLink, setEditingLink] = useState<FooterLink | null>(null);

  const [newSocial, setNewSocial] = useState({
    name: '',
    url: '',
    icon: 'facebook',
    sort_order: 0,
    is_active: true
  });

  const [newLink, setNewLink] = useState({
    label: '',
    url: '',
    sort_order: 0,
    is_legal: false,
    is_active: true
  });

  // Update local settings when settings change
  React.useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    if (!localSettings) return;
    
    setSaving(true);
    try {
      await updateSettings(localSettings);
      toast({
        title: "Paramètres sauvegardés",
        description: "Les paramètres du footer ont été mis à jour avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSocial = async () => {
    try {
      await addSocialLink(newSocial);
      setNewSocial({ name: '', url: '', icon: 'facebook', sort_order: 0, is_active: true });
      setSocialDialogOpen(false);
      toast({
        title: "Lien social ajouté",
        description: "Le lien social a été ajouté avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le lien social.",
        variant: "destructive",
      });
    }
  };

  const handleAddLink = async () => {
    try {
      await addFooterLink(newLink);
      setNewLink({ label: '', url: '', sort_order: 0, is_legal: false, is_active: true });
      setLinkDialogOpen(false);
      toast({
        title: "Lien ajouté",
        description: "Le lien a été ajouté avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le lien.",
        variant: "destructive",
      });
    }
  };

  const addLegalLink = async (pageSlug: string, pageTitle: string) => {
    try {
      await addFooterLink({
        label: pageTitle,
        url: `/legal/${pageSlug}`,
        sort_order: footerLinks.length,
        is_legal: true,
        is_active: true
      });
      toast({
        title: "Lien légal ajouté",
        description: `Le lien vers "${pageTitle}" a été ajouté.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le lien légal.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Footer Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Paramètres du Footer</CardTitle>
          <CardDescription>
            Configurez les informations affichées dans le footer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="copyright">Texte de copyright</Label>
              <Input
                id="copyright"
                value={localSettings?.copyright_text || ''}
                onChange={(e) => setLocalSettings(prev => prev ? { ...prev, copyright_text: e.target.value } : null)}
                placeholder="© 2025 Mon entreprise - Tous droits réservés"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={localSettings?.company_email || ''}
                onChange={(e) => setLocalSettings(prev => prev ? { ...prev, company_email: e.target.value } : null)}
                placeholder="contact@monentreprise.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={localSettings?.company_phone || ''}
                onChange={(e) => setLocalSettings(prev => prev ? { ...prev, company_phone: e.target.value } : null)}
                placeholder="+33 1 23 45 67 89"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cookies">URL de gestion des cookies</Label>
              <Input
                id="cookies"
                value={localSettings?.cookie_management_url || ''}
                onChange={(e) => setLocalSettings(prev => prev ? { ...prev, cookie_management_url: e.target.value } : null)}
                placeholder="#"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Textarea
              id="address"
              value={localSettings?.company_address || ''}
              onChange={(e) => setLocalSettings(prev => prev ? { ...prev, company_address: e.target.value } : null)}
              placeholder="123 Rue de la République, 75001 Paris, France"
              rows={3}
            />
          </div>

          <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
          </Button>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Réseaux sociaux
            <Dialog open={socialDialogOpen} onOpenChange={setSocialDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un réseau social</DialogTitle>
                  <DialogDescription>
                    Ajoutez un nouveau lien vers vos réseaux sociaux
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="social-name">Nom</Label>
                    <Input
                      id="social-name"
                      value={newSocial.name}
                      onChange={(e) => setNewSocial(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Facebook"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="social-url">URL</Label>
                    <Input
                      id="social-url"
                      value={newSocial.url}
                      onChange={(e) => setNewSocial(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://facebook.com/monentreprise"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="social-icon">Icône</Label>
                    <Select value={newSocial.icon} onValueChange={(value) => setNewSocial(prev => ({ ...prev, icon: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="twitter">Twitter</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddSocial}>Ajouter</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {socialLinks.map((link) => (
              <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <div>
                    <div className="font-medium">{link.name}</div>
                    <div className="text-sm text-muted-foreground">{link.url}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => window.open(link.url, '_blank')}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteSocialLink(link.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {socialLinks.length === 0 && (
              <p className="text-muted-foreground text-center py-4">Aucun réseau social configuré</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Footer Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Liens du footer
            <div className="flex gap-2">
              <Select onValueChange={(slug) => {
                const page = pages.find(p => p.slug === slug);
                if (page) addLegalLink(page.slug, page.title);
              }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Ajouter lien légal" />
                </SelectTrigger>
                <SelectContent>
                  {pages.filter(p => p.status === 'published').map((page) => (
                    <SelectItem key={page.id} value={page.slug}>
                      {page.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter lien
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter un lien</DialogTitle>
                    <DialogDescription>
                      Ajoutez un nouveau lien dans le footer
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="link-label">Libellé</Label>
                      <Input
                        id="link-label"
                        value={newLink.label}
                        onChange={(e) => setNewLink(prev => ({ ...prev, label: e.target.value }))}
                        placeholder="Contact"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="link-url">URL</Label>
                      <Input
                        id="link-url"
                        value={newLink.url}
                        onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="/contact"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddLink}>Ajouter</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {footerLinks.map((link) => (
              <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {link.label}
                      {link.is_legal && <span className="text-xs bg-muted px-2 py-1 rounded">Légal</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">{link.url}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => window.open(link.url, '_blank')}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteFooterLink(link.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {footerLinks.length === 0 && (
              <p className="text-muted-foreground text-center py-4">Aucun lien configuré</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};