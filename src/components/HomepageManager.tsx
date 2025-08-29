import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useHomepageConfig } from '@/hooks/useHomepageConfig';
import { HomepageAssetUploader } from './HomepageAssetUploader';
import { FooterManager } from './FooterManager';
import { LegalPageManager } from './LegalPageManager';
import { Separator } from '@/components/ui/separator';
import { Home, Type, Image, BarChart, MessageCircle, Settings, FileText, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export const HomepageManager = () => {
  const { config, updateConfig } = useHomepageConfig();
  const [saving, setSaving] = useState(false);

  const handleSaveSection = async (sectionName: string) => {
    setSaving(true);
    try {
      // La fonction updateConfig sauvegarde déjà automatiquement
      toast.success(`${sectionName} sauvegardé avec succès`);
    } catch (error) {
      toast.error(`Erreur lors de la sauvegarde de ${sectionName}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo et Banner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Images de la page d'accueil
          </CardTitle>
          <CardDescription>
            Gérez les images principales de votre site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <HomepageAssetUploader
            label="Logo du site"
            currentUrl={config.logoUrl}
            onUrlChange={(url) => updateConfig({ logoUrl: url })}
            bucketPath="logo"
            recommendedDimensions="200x60px (PNG avec transparence recommandé)"
          />
          
          <Separator />
          
          <HomepageAssetUploader
            label="Image de bannière"
            currentUrl={config.bannerUrl}
            onUrlChange={(url) => updateConfig({ bannerUrl: url })}
            bucketPath="banner"
            recommendedDimensions="1920x600px"
          />
          
          <div>
            <Label htmlFor="banner-alt">Texte alternatif de la bannière</Label>
            <Input
              id="banner-alt"
              value={config.bannerAlt}
              onChange={(e) => updateConfig({ bannerAlt: e.target.value })}
              placeholder="Description de l'image pour l'accessibilité"
            />
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => handleSaveSection("Images")}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Sauvegarde..." : "Sauvegarder les paramètres"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Titres du site */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Titres et branding
          </CardTitle>
          <CardDescription>
            Configurez les titres principaux de votre site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="site-title">Titre du site</Label>
            <Input
              id="site-title"
              value={config.siteTitle}
              onChange={(e) => updateConfig({ siteTitle: e.target.value })}
              placeholder="Nom de votre plateforme"
            />
          </div>
          
          <div>
            <Label htmlFor="site-subtitle">Sous-titre du site</Label>
            <Input
              id="site-subtitle"
              value={config.siteSubtitle}
              onChange={(e) => updateConfig({ siteSubtitle: e.target.value })}
              placeholder="Description courte de votre plateforme"
            />
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => handleSaveSection("Titres et branding")}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Sauvegarde..." : "Sauvegarder les paramètres"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section Hero */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Section principale (Hero)
          </CardTitle>
          <CardDescription>
            Le contenu affiché en premier sur votre page d'accueil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="hero-title">Titre principal</Label>
            <Input
              id="hero-title"
              value={config.heroTitle}
              onChange={(e) => updateConfig({ heroTitle: e.target.value })}
              placeholder="Titre accrocheur pour vos visiteurs"
            />
          </div>
          
          <div>
            <Label htmlFor="hero-description">Description</Label>
            <Textarea
              id="hero-description"
              value={config.heroDescription}
              onChange={(e) => updateConfig({ heroDescription: e.target.value })}
              placeholder="Description de votre plateforme et de ses avantages"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hero-cta-primary">Bouton principal</Label>
              <Input
                id="hero-cta-primary"
              value={config.heroCta_primary}
              onChange={(e) => updateConfig({ heroCta_primary: e.target.value })}
                placeholder="Commencer"
              />
            </div>
            
            <div>
              <Label htmlFor="hero-cta-secondary">Bouton secondaire</Label>
              <Input
                id="hero-cta-secondary"
              value={config.heroCta_secondary}
              onChange={(e) => updateConfig({ heroCta_secondary: e.target.value })}
                placeholder="En savoir plus"
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => handleSaveSection("Section Hero")}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Sauvegarde..." : "Sauvegarder les paramètres"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Section fonctionnalités
          </CardTitle>
          <CardDescription>
            Présentez les principales fonctionnalités de votre plateforme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="features-title">Titre de la section</Label>
            <Input
              id="features-title"
              value={config.featuresTitle}
              onChange={(e) => updateConfig({ featuresTitle: e.target.value })}
              placeholder="Nos fonctionnalités"
            />
          </div>
          
          <div>
            <Label htmlFor="features-description">Description</Label>
            <Textarea
              id="features-description"
              value={config.featuresDescription}
              onChange={(e) => updateConfig({ featuresDescription: e.target.value })}
              placeholder="Description de vos fonctionnalités principales"
              rows={2}
            />
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => handleSaveSection("Section fonctionnalités")}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Sauvegarde..." : "Sauvegarder les paramètres"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Statistiques à afficher
          </CardTitle>
          <CardDescription>
            Chiffres clés à mettre en avant sur votre page d'accueil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="stat1-number">Statistique 1 - Nombre</Label>
              <Input
                id="stat1-number"
                value={config.stat1Number}
                onChange={(e) => updateConfig({ stat1Number: e.target.value })}
                placeholder="1000+"
              />
              <Label htmlFor="stat1-label" className="text-sm text-muted-foreground mt-1">Libellé</Label>
              <Input
                id="stat1-label"
                value={config.stat1Label}
                onChange={(e) => updateConfig({ stat1Label: e.target.value })}
                placeholder="Utilisateurs actifs"
              />
            </div>
            
            <div>
              <Label htmlFor="stat2-number">Statistique 2 - Nombre</Label>
              <Input
                id="stat2-number"
                value={config.stat2Number}
                onChange={(e) => updateConfig({ stat2Number: e.target.value })}
                placeholder="500+"
              />
              <Label htmlFor="stat2-label" className="text-sm text-muted-foreground mt-1">Libellé</Label>
              <Input
                id="stat2-label"
                value={config.stat2Label}
                onChange={(e) => updateConfig({ stat2Label: e.target.value })}
                placeholder="Tests réalisés"
              />
            </div>
            
            <div>
              <Label htmlFor="stat3-number">Statistique 3 - Nombre</Label>
              <Input
                id="stat3-number"
                value={config.stat3Number}
                onChange={(e) => updateConfig({ stat3Number: e.target.value })}
                placeholder="95%"
              />
              <Label htmlFor="stat3-label" className="text-sm text-muted-foreground mt-1">Libellé</Label>
              <Input
                id="stat3-label"
                value={config.stat3Label}
                onChange={(e) => updateConfig({ stat3Label: e.target.value })}
                placeholder="Taux de réussite"
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => handleSaveSection("Statistiques")}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Sauvegarde..." : "Sauvegarder les paramètres"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Appel à l'action final
          </CardTitle>
          <CardDescription>
            Section d'incitation en bas de page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cta-title">Titre de l'appel à l'action</Label>
            <Input
              id="cta-title"
              value={config.ctaTitle}
              onChange={(e) => updateConfig({ ctaTitle: e.target.value })}
              placeholder="Prêt à commencer ?"
            />
          </div>
          
          <div>
            <Label htmlFor="cta-description">Description</Label>
            <Textarea
              id="cta-description"
              value={config.ctaDescription}
              onChange={(e) => updateConfig({ ctaDescription: e.target.value })}
              placeholder="Rejoignez-nous dès maintenant"
              rows={2}
            />
          </div>
          
          <div>
            <Label htmlFor="cta-button">Texte du bouton</Label>
            <Input
              id="cta-button"
              value={config.ctaButton}
              onChange={(e) => updateConfig({ ctaButton: e.target.value })}
              placeholder="Commencer maintenant"
            />
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => handleSaveSection("Appel à l'action")}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Sauvegarde..." : "Sauvegarder les paramètres"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Séparateur pour les paramètres du footer */}
      <div className="pt-8">
        <Separator className="mb-6" />
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Paramètres du footer et pages légales</h2>
        </div>
      </div>

      {/* Footer Manager */}
      <FooterManager />

      {/* Legal Page Manager */}
      <LegalPageManager />
    </div>
  );
};