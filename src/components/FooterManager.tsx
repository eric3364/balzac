import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useFooterSettings } from '@/hooks/useFooterSettings';
import { usePublicLegalPage } from '@/hooks/useLegalPage';
import { Loader2 } from 'lucide-react';

const FooterManager: React.FC = () => {
  const { settings, loading, updateSettings } = useFooterSettings();
  const { page: legalPage } = usePublicLegalPage();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await updateSettings({
      copyright_text: formData.get('copyright_text') as string,
      legal_link_label: formData.get('legal_link_label') as string,
      legal_link_enabled: formData.get('legal_link_enabled') === 'on',
    });
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
          <CardTitle>Configuration du Footer</CardTitle>
          <CardDescription>
            Gérez les paramètres d'affichage du footer de votre site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="copyright_text">Texte de copyright</Label>
              <Input
                id="copyright_text"
                name="copyright_text"
                defaultValue={settings.copyright_text}
                placeholder="© 2025 NEXT-U – Tous droits réservés."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legal_link_label">Libellé du lien mentions légales</Label>
              <Input
                id="legal_link_label"
                name="legal_link_label"
                defaultValue={settings.legal_link_label}
                placeholder="Mentions légales"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="legal_link_enabled"
                name="legal_link_enabled"
                defaultChecked={settings.legal_link_enabled}
              />
              <Label htmlFor="legal_link_enabled">Afficher le lien mentions légales</Label>
            </div>

            <Button type="submit" className="w-full">
              Enregistrer les modifications
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aperçu du Footer</CardTitle>
          <CardDescription>
            Voici comment votre footer apparaîtra sur le site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg p-4 bg-muted">
            <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
              <p>{settings.copyright_text}</p>
              {settings.legal_link_enabled && legalPage && (
                <div className="flex space-x-4 mt-2 sm:mt-0">
                  <a 
                    href="/mentions-legales" 
                    className="hover:text-foreground transition-colors"
                  >
                    {settings.legal_link_label}
                  </a>
                </div>
              )}
            </div>
          </div>
          {settings.legal_link_enabled && !legalPage && (
            <p className="text-sm text-orange-600 mt-2">
              ⚠️ Le lien sera masqué car la page mentions légales n'est pas publiée
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FooterManager;